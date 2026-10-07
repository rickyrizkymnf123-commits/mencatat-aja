import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { parseTransactionText, parseReceiptPhoto, generateAIAdvisorMessage } from '@/lib/ai-provider';
import {
  sendTelegramMessage,
  formatExpenseReply,
  formatIncomeReply,
  formatLimitReachedMessage,
  formatPhotoReceiptStarterMessage,
  formatIDR
} from '@/lib/telegram';
import { appendTransactionToSheet } from '@/lib/google-sheets';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const updateId = body.update_id;
    if (!updateId) {
      return NextResponse.json({ ok: true, note: 'No update_id' });
    }

    const supabase = createAdminClient();

    // 1. Idempotency Check: skip if update_id already processed
    const { data: existingUpdate } = await supabase
      .from('telegram_processed_updates')
      .select('id')
      .eq('update_id', updateId)
      .maybeSingle();

    if (existingUpdate) {
      return NextResponse.json({ ok: true, note: 'Idempotent skip' });
    }

    // Record update_id immediately
    await supabase.from('telegram_processed_updates').insert({ update_id: updateId });

    const message = body.message;
    if (!message || !message.chat) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const text = message.text?.trim() || '';
    const photos = message.photo;

    // 2. Find Profile by telegram_chat_id
    let { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('telegram_chat_id', chatId)
      .maybeSingle();

    // Fallback: If not linked yet, check contact message or ask user to connect via web app
    if (!profile) {
      const defaultToken = process.env.TELEGRAM_BOT_TOKEN;
      if (text.startsWith('/start')) {
        await sendTelegramMessage(
          defaultToken || '',
          chatId,
          `👋 *Selamat datang di mencatat.id!*

Aplikasi pencatatan keuangan pribadi serba otomatis dari Telegram.

Untuk memulainya:
1. Daftar / Masuk di *https://mencatat.id*
2. Ke menu *Settings -> Telegram Bot*
3. Masukkan chat ID kamu: \`${chatId}\` atau hubungkan via tombol di dashboard.

Setelah terhubung, tinggal ketik transaksi seperti:
• \`beli bakso 15rb\`
• \`gajian 5jt\``
        );
        return NextResponse.json({ ok: true });
      }

      await sendTelegramMessage(
        defaultToken || '',
        chatId,
        `⚠️ Akun Telegram kamu belum terhubung dengan mencatat.id.
Silakan login ke https://mencatat.id dan masukkan Chat ID kamu: \`${chatId}\` pada menu Settings.`
      );
      return NextResponse.json({ ok: true });
    }

    const botToken = profile.telegram_bot_token || process.env.TELEGRAM_BOT_TOKEN || '';

    // 3. Handle Commands
    if (text.startsWith('/')) {
      await handleBotCommands(supabase, profile, chatId, text, botToken);
      return NextResponse.json({ ok: true });
    }

    // 4. Handle Photo Receipts (Pro only)
    if (photos && photos.length > 0) {
      if (profile.plan === 'starter') {
        await sendTelegramMessage(botToken, chatId, formatPhotoReceiptStarterMessage());
        return NextResponse.json({ ok: true });
      }

      // Pro Plan: Process Receipt Photo OCR
      await sendTelegramMessage(botToken, chatId, '🔍 *Menganalisa foto struk belanjaan kamu...*');

      // Fetch photo file from Telegram
      const photoFileId = photos[photos.length - 1].file_id;
      const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${photoFileId}`);
      const fileData = await fileRes.json();

      let parsedReceipt: any = null;
      if (fileData.ok && fileData.result.file_path) {
        const imgRes = await fetch(`https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`);
        const arrayBuffer = await imgRes.arrayBuffer();
        const base64Img = Buffer.from(arrayBuffer).toString('base64');
        parsedReceipt = await parseReceiptPhoto(base64Img);
      }

      if (!parsedReceipt || parsedReceipt.nominal <= 0) {
        await sendTelegramMessage(botToken, chatId, '❌ Struk tidak terbaca dengan jelas. Pastikan foto struk terang dan fokus.');
        return NextResponse.json({ ok: true });
      }

      // Record transaction
      await recordTransactionAndReply(supabase, profile, chatId, botToken, parsedReceipt, 'telegram_receipt');
      return NextResponse.json({ ok: true });
    }

    // 5. Check Starter Limit (50 transactions / month)
    if (profile.plan === 'starter') {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { count } = await supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .gte('created_at', firstDayOfMonth);

      if (count && count >= 50) {
        await sendTelegramMessage(botToken, chatId, formatLimitReachedMessage(count));
        return NextResponse.json({ ok: true });
      }
    }

    // 6. Natural Language Text Input Parsing via AI
    if (!text) {
      return NextResponse.json({ ok: true });
    }

    // Fetch user categories for context
    const { data: userCats } = await supabase
      .from('categories')
      .select('name')
      .eq('user_id', profile.id);

    const categoryNames = userCats ? userCats.map((c: any) => c.name) : [];
    const parsed = await parseTransactionText(text, categoryNames);

    if (!parsed || parsed.nominal <= 0) {
      await sendTelegramMessage(
        botToken,
        chatId,
        `🤔 *Maaf, mencatat.id kurang memahami transaksi tersebut.*

Format yang benar contohnya:
• \`beli bakso 15rb\`
• \`gajian 5jt\`
• \`bensin 50k\`

Coba ketik ulang kalimat kamu ya!`
      );
      return NextResponse.json({ ok: true });
    }

    // 7. Save Transaction & Send Rich Reply
    await recordTransactionAndReply(supabase, profile, chatId, botToken, parsed, 'telegram_text');

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Telegram Webhook Route Error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

/**
 * Handle Telegram Command messages
 */
async function handleBotCommands(supabase: any, profile: any, chatId: number, text: string, botToken: string) {
  const command = text.split(' ')[0].toLowerCase();

  if (command === '/saldo') {
    const { data: wallets } = await supabase.from('wallets').select('*').eq('user_id', profile.id);
    if (!wallets || wallets.length === 0) {
      await sendTelegramMessage(botToken, chatId, '👛 Belum ada dompet tercatat.');
      return;
    }
    let total = 0;
    const lines = wallets.map((w: any) => {
      total += Number(w.balance);
      return `├ ${w.is_default ? '⭐ ' : ''}${w.name} : ${formatIDR(Number(w.balance))}`;
    });
    await sendTelegramMessage(
      botToken,
      chatId,
      `💼 *Rincian Saldo Dompet Kamu:*
${lines.join('\n')}
└ *Total Saldo : ${formatIDR(total)}*`
    );
  } else if (command === '/sheet') {
    if (profile.plan === 'starter') {
      await sendTelegramMessage(botToken, chatId, '🔒 Integrasi Google Sheet pribadi adalah fitur khusus *Paket Pro*. Upgrade di web dashboard!');
    } else {
      const sheetUrl = profile.google_sheet_url || 'https://docs.google.com';
      await sendTelegramMessage(botToken, chatId, `📊 *Google Sheet Pribadi Kamu:*\n[Klik di sini untuk membuka Sheet](${sheetUrl})`);
    }
  } else if (command === '/bantuan' || command === '/help') {
    await sendTelegramMessage(
      botToken,
      chatId,
      `📌 *Daftar Perintah mencatat.id:*

• \`/saldo\` — Cek saldo semua dompet
• \`/hari ini\` — Rekap transaksi hari ini
• \`/minggu ini\` — Rekap 7 hari terakhir
• \`/bulan ini\` — Rekap bulan berjalan
• \`/budget\` — Status budget kategori
• \`/sheet\` — Link Google Sheet kamu
• \`/bantuan\` — Tampilkan daftar bantuan ini`
    );
  } else if (command === '/budget') {
    const { data: categories } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', profile.id)
      .gt('monthly_budget', 0);

    if (!categories || categories.length === 0) {
      await sendTelegramMessage(botToken, chatId, '🎯 Belum ada budget kategori yang diatur bulan ini.');
      return;
    }
    const lines = categories.map((c: any) => `${c.emoji} *${c.name}*: Budget ${formatIDR(c.monthly_budget)}`);
    await sendTelegramMessage(botToken, chatId, `🎯 *Status Budget Bulan Ini:*\n\n${lines.join('\n')}`);
  } else {
    await sendTelegramMessage(botToken, chatId, `🤖 Ketik \`/bantuan\` untuk melihat daftar perintah.`);
  }
}

/**
 * Record transaction to Supabase, update Wallet balance, append to Google Sheet, and reply via Telegram
 */
async function recordTransactionAndReply(
  supabase: any,
  profile: any,
  chatId: number,
  botToken: string,
  parsed: any,
  source: 'telegram_text' | 'telegram_receipt'
) {
  // 1. Get or setup default wallet
  let { data: defaultWallet } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', profile.id)
    .eq('is_default', true)
    .maybeSingle();

  if (!defaultWallet) {
    const { data: anyWallet } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', profile.id)
      .limit(1)
      .maybeSingle();
    defaultWallet = anyWallet;
  }

  if (!defaultWallet) {
    // Create initial Cash wallet
    const { data: createdWallet } = await supabase
      .from('wallets')
      .insert({
        user_id: profile.id,
        name: 'Cash / Tunai',
        balance: 0,
        is_default: true,
        color: '#10b981',
      })
      .select()
      .single();
    defaultWallet = createdWallet;
  }

  // 2. Find or match category
  let categoryId = null;
  let categoryEmoji = '📁';
  let categoryName = parsed.kategori || 'Umum';
  let monthlyBudget = 0;
  let budgetUsedMonth = 0;

  if (parsed.kategori) {
    let { data: matchedCategory } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', profile.id)
      .ilike('name', `%${parsed.kategori}%`)
      .maybeSingle();

    if (!matchedCategory) {
      // Auto create category
      const { data: newCat } = await supabase
        .from('categories')
        .insert({
          user_id: profile.id,
          name: parsed.kategori,
          emoji: parsed.jenis === 'pemasukan' ? '💼' : '💸',
          color: '#10b981',
          type: parsed.jenis === 'pemasukan' ? 'income' : 'expense',
          monthly_budget: 0,
        })
        .select()
        .single();
      matchedCategory = newCat;
    }

    if (matchedCategory) {
      categoryId = matchedCategory.id;
      categoryEmoji = matchedCategory.emoji || '📁';
      categoryName = matchedCategory.name;
      monthlyBudget = Number(matchedCategory.monthly_budget || 0);
    }
  }

  // 3. Calculate new balance
  const currentBalance = Number(defaultWallet.balance);
  const transactionAmount = Number(parsed.nominal);
  const isIncome = parsed.jenis === 'pemasukan';
  const newBalance = isIncome ? currentBalance + transactionAmount : currentBalance - transactionAmount;

  // Update Wallet Balance
  await supabase
    .from('wallets')
    .update({ balance: newBalance })
    .eq('id', defaultWallet.id);

  // Insert Transaction
  const nowStr = new Date().toISOString();
  const { data: newTx } = await supabase
    .from('transactions')
    .insert({
      user_id: profile.id,
      wallet_id: defaultWallet.id,
      category_id: categoryId,
      type: isIncome ? 'income' : 'expense',
      amount: transactionAmount,
      notes: parsed.catatan || parsed.kategori,
      source,
      transaction_date: nowStr,
    })
    .select()
    .single();

  // 4. Calculate monthly budget total used for this category
  if (!isIncome && categoryId) {
    const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const { data: monthTxs } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', profile.id)
      .eq('category_id', categoryId)
      .eq('type', 'expense')
      .gte('transaction_date', firstDay);

    if (monthTxs) {
      budgetUsedMonth = monthTxs.reduce((sum: number, t: any) => sum + Number(t.amount), 0);
    }
  }

  // 5. Append to Google Sheet (Pro users or enabled sheets)
  if (profile.plan === 'pro' && profile.google_sheet_id) {
    const nowWIB = new Date();
    const dateYMD = nowWIB.toISOString().split('T')[0];
    const timeHHMM = nowWIB.toTimeString().split(' ')[0].substring(0, 5);

    if (parsed.items && parsed.items.length > 0) {
      // Split receipt items into separate rows in Google Sheet
      for (const item of parsed.items) {
        await appendTransactionToSheet(profile.google_sheet_id, {
          tanggal: dateYMD,
          jam: `${timeHHMM} WIB`,
          jenis: 'Pengeluaran',
          nominal: item.harga || 0,
          kategori: item.kategori || categoryName,
          wallet: defaultWallet.name,
          catatan: item.nama || parsed.catatan,
          sumber: 'Telegram Struk',
        });
      }
    } else {
      await appendTransactionToSheet(profile.google_sheet_id, {
        tanggal: dateYMD,
        jam: `${timeHHMM} WIB`,
        jenis: isIncome ? 'Pemasukan' : 'Pengeluaran',
        nominal: transactionAmount,
        kategori: categoryName,
        wallet: defaultWallet.name,
        catatan: parsed.catatan,
        sumber: source === 'telegram_receipt' ? 'Telegram Struk' : 'Telegram Teks',
      });
    }
  }

  // 6. Send Format Reply
  if (isIncome) {
    const replyText = formatIncomeReply({
      amount: transactionAmount,
      walletName: defaultWallet.name,
      walletBalanceAfter: newBalance,
    });
    await sendTelegramMessage(botToken, chatId, replyText);
  } else {
    const replyText = formatExpenseReply({
      amount: transactionAmount,
      categoryName,
      categoryEmoji,
      walletName: defaultWallet.name,
      notes: parsed.catatan,
      walletBalanceAfter: newBalance,
      monthlyBudget,
      budgetUsedMonth,
    });
    await sendTelegramMessage(botToken, chatId, replyText);

    // AI Financial Advisor Trigger (Pro Plan)
    if (profile.plan === 'pro' && monthlyBudget > 0 && budgetUsedMonth > monthlyBudget * 0.8) {
      const advisorMsg = await generateAIAdvisorMessage(profile.full_name, categoryName);
      await sendTelegramMessage(botToken, chatId, advisorMsg);
    }
  }
}
