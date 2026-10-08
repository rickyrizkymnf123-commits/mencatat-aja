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
import { decrypt } from '@/lib/crypto';

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const queryUserId = url.searchParams.get('user_id');
    const queryBotToken = url.searchParams.get('bot_token');

    const body = await req.json();
    const updateId = body.update_id;
    if (!updateId) {
      return NextResponse.json({ ok: true, note: 'No update_id' });
    }

    const supabase = createAdminClient();

    // 1. Idempotency Check
    try {
      const { data: existingUpdate } = await supabase
        .from('processed_telegram_updates')
        .select('id')
        .eq('id', updateId)
        .maybeSingle();

      if (existingUpdate) {
        return NextResponse.json({ ok: true, note: 'Idempotent skip' });
      }

      await supabase.from('processed_telegram_updates').insert({ id: updateId });
    } catch (idempErr) {
      console.warn('Idempotency table notice:', idempErr);
    }

    const message = body.message || body.edited_message;
    if (!message || !message.chat) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const text = (message.text || message.caption || '').trim();
    const photos = message.photo;

    // 2. Resolve Profile
    let profile: any = null;

    // A. By telegram_chat_id
    const { data: profByChat } = await supabase
      .from('profiles')
      .select('*')
      .eq('telegram_chat_id', String(chatId))
      .maybeSingle();

    profile = profByChat;

    // B. By queryUserId if not linked yet
    if (!profile && queryUserId) {
      const { data: profById } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', queryUserId)
        .maybeSingle();

      if (profById) {
        profile = profById;
        // Auto link this chat ID to user profile
        await supabase
          .from('profiles')
          .update({
            telegram_chat_id: String(chatId),
            updated_at: new Date().toISOString()
          })
          .eq('id', queryUserId);
        profile.telegram_chat_id = String(chatId);
      }
    }

    // C. Resolve Bot Token
    let resolvedBotToken = queryBotToken || '';
    if (!resolvedBotToken && profile?.telegram_bot_token) {
      const dec = decrypt(profile.telegram_bot_token);
      resolvedBotToken = dec || profile.telegram_bot_token;
    }
    if (!resolvedBotToken) {
      resolvedBotToken = process.env.TELEGRAM_BOT_TOKEN || '';
    }

    // 3. If profile still not found
    if (!profile) {
      if (text.startsWith('/start') || text.toLowerCase() === 'p' || text.toLowerCase() === 'halo') {
        await sendTelegramMessage(
          resolvedBotToken,
          chatId,
          `👋 *Selamat datang di mencatat.id!*

Aplikasi pencatatan keuangan pribadi serba otomatis dari Telegram.

Untuk menghubungkan akun kamu:
1. Masuk ke web *https://mencatat.id* (atau *https://www.mencatat.my.id*)
2. Buka menu *Settings -> Integrasi Telegram Bot*
3. Tempelkan token bot ini dan klik *Test Koneksi*.

Setelah terhubung, kamu bisa langsung mencatat pengeluaran semudah kirim chat:
• \`beli kopi 25rb\`
• \`gajian 5jt\`
• \`bensin 50k\``
        );
        return NextResponse.json({ ok: true });
      }

      await sendTelegramMessage(
        resolvedBotToken,
        chatId,
        `⚠️ Akun Telegram kamu belum terhubung dengan mencatat.id.
Silakan buka menu *Settings* di web dashboard untuk menghubungkan bot ini.`
      );
      return NextResponse.json({ ok: true });
    }

    // Ensure telegram_chat_id is saved if it was missing or different
    if (!profile.telegram_chat_id || profile.telegram_chat_id !== String(chatId)) {
      await supabase
        .from('profiles')
        .update({
          telegram_chat_id: String(chatId),
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);
      profile.telegram_chat_id = String(chatId);
    }

    // 4. Handle Commands (/saldo, /budget, /bantuan, /start, dll)
    if (text.startsWith('/')) {
      await handleBotCommands(supabase, profile, chatId, text, resolvedBotToken);
      return NextResponse.json({ ok: true });
    }

    // 5. Handle Photo Receipts
    if (photos && photos.length > 0) {
      const isPro = (profile.plan || '').toLowerCase() === 'pro';
      if (!isPro) {
        await sendTelegramMessage(resolvedBotToken, chatId, formatPhotoReceiptStarterMessage());
        return NextResponse.json({ ok: true });
      }

      await sendTelegramMessage(resolvedBotToken, chatId, '🔍 *Menganalisa foto struk belanjaan kamu...*');

      const photoFileId = photos[photos.length - 1].file_id;
      const fileRes = await fetch(`https://api.telegram.org/bot${resolvedBotToken}/getFile?file_id=${photoFileId}`);
      const fileData = await fileRes.json();

      let parsedReceipt: any = null;
      if (fileData.ok && fileData.result.file_path) {
        const imgRes = await fetch(`https://api.telegram.org/file/bot${resolvedBotToken}/${fileData.result.file_path}`);
        const arrayBuffer = await imgRes.arrayBuffer();
        const base64Img = Buffer.from(arrayBuffer).toString('base64');
        parsedReceipt = await parseReceiptPhoto(base64Img);
      }

      if (!parsedReceipt || parsedReceipt.nominal <= 0) {
        await sendTelegramMessage(resolvedBotToken, chatId, '❌ Struk tidak terbaca dengan jelas. Pastikan foto struk terang dan fokus.');
        return NextResponse.json({ ok: true });
      }

      await recordTransactionAndReply(supabase, profile, chatId, resolvedBotToken, parsedReceipt, 'telegram_receipt');
      return NextResponse.json({ ok: true });
    }

    // 6. Handle Casual greetings or non-financial messages ("p", "halo", "hai", "test")
    const lower = text.toLowerCase();
    if (['p', 'halo', 'hai', 'hi', 'ping', 'test', 'tes', 'assalamualaikum', 'selamat pagi', 'selamat siang', 'selamat malam'].includes(lower)) {
      await sendTelegramMessage(
        resolvedBotToken,
        chatId,
        `👋 Halo *${profile.full_name || 'Kak'}*! Aku siap membantu mencatat keuanganmu.

💡 *Contoh cara mencatat:*
• \`beli kopi 25rb\` *(pengeluaran)*
• \`gaji freelance 2.5jt\` *(pemasukan)*
• \`bensin 50k tunai\`
• \`transfer dari BCA ke Gopay 200rb\`

📌 *Pintasan Perintah:*
• \`/saldo\` — Cek saldo seluruh dompet
• \`/budget\` — Cek sisa limit anggaran
• \`/bantuan\` — Bantuan & panduan lengkap`
      );
      return NextResponse.json({ ok: true });
    }

    // 7. Check Transaction Limit (Starter 50 tx/month)
    const isPro = (profile.plan || '').toLowerCase() === 'pro';
    if (!isPro) {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { count } = await supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .gte('created_at', firstDayOfMonth);

      if (count && count >= 50) {
        await sendTelegramMessage(resolvedBotToken, chatId, formatLimitReachedMessage(count));
        return NextResponse.json({ ok: true });
      }
    }

    // 8. Natural Language Text Input Parsing via AI
    const { data: userCats } = await supabase
      .from('categories')
      .select('name')
      .eq('user_id', profile.id);

    const categoryNames = userCats ? userCats.map((c: any) => c.name) : [];
    const parsed = await parseTransactionText(text, categoryNames);

    if (!parsed || !parsed.nominal || parsed.nominal <= 0) {
      await sendTelegramMessage(
        resolvedBotToken,
        chatId,
        `🤔 *Maaf, transaksi belum terbaca.*

Contoh format yang bisa kamu ketik:
• \`beli bakso 15rb\`
• \`gajian 5jt\`
• \`bensin motor 30k\`
• \`transfer bca ke gopay 100rb\`

Ketik \`/bantuan\` untuk melihat daftar menu lengkap!`
      );
      return NextResponse.json({ ok: true });
    }

    // 9. Save Transaction & Send Rich Reply
    await recordTransactionAndReply(supabase, profile, chatId, resolvedBotToken, parsed, 'telegram_text');

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

  if (command === '/start') {
    await sendTelegramMessage(
      botToken,
      chatId,
      `🚀 *Selamat Datang di mencatat.id!*

Halo *${profile.full_name || 'Nasabah'}*, bot asisten keuangan pintar kamu sudah aktif 24/7.

📖 *Contoh Penggunaan Langsung:*
• \`beli bakso 15rb\` *(Mencatat pengeluaran)*
• \`gaji freelance 3jt\` *(Mencatat pemasukan)*
• \`transfer dari BCA ke Gopay 500rb\` *(Mencatat transfer)*

Gunakan perintah cepat di bawah ini:
• \`/saldo\` — Cek saldo semua dompet
• \`/budget\` — Cek sisa anggaran kategori
• \`/bantuan\` — Buka panduan lengkap`
    );
  } else if (command === '/saldo') {
    const { data: wallets } = await supabase.from('wallets').select('*').eq('user_id', profile.id);
    if (!wallets || wallets.length === 0) {
      await sendTelegramMessage(botToken, chatId, '👛 Belum ada dompet tercatat. Silakan buat dompet di dashboard web!');
      return;
    }
    let total = 0;
    const lines = wallets.map((w: any) => {
      total += Number(w.balance || 0);
      return `├ ${w.is_default ? '⭐ ' : ''}${w.name} : ${formatIDR(Number(w.balance || 0))}`;
    });
    await sendTelegramMessage(
      botToken,
      chatId,
      `💼 *Rincian Saldo Dompet Kamu:*
${lines.join('\n')}
└ *Total Saldo : ${formatIDR(total)}*`
    );
  } else if (command === '/sheet') {
    const isPro = (profile.plan || '').toLowerCase() === 'pro';
    if (!isPro) {
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
• \`/budget\` — Status budget kategori
• \`/sheet\` — Link Google Sheet kamu
• \`/bantuan\` — Tampilkan daftar bantuan ini

💡 *Cara Mencatat Otomatis:*
Cukup kirim teks biasa:
• \`beli kopi 25rb\`
• \`makan siang 35k tunai\`
• \`gaji 7.5jt\`
• \`transfer bca ke ovo 150rb\``
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
    const lines = categories.map((c: any) => `${c.emoji || '📁'} *${c.name}*: Budget ${formatIDR(Number(c.monthly_budget))}`);
    await sendTelegramMessage(botToken, chatId, `🎯 *Status Budget Bulan Ini:*\n\n${lines.join('\n')}`);
  } else {
    await sendTelegramMessage(botToken, chatId, `🤖 Perintah tidak dikenal. Ketik \`/bantuan\` untuk melihat daftar perintah.`);
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
  const currentBalance = Number(defaultWallet.balance || 0);
  const transactionAmount = Number(parsed.nominal || 0);
  const isIncome = parsed.jenis === 'pemasukan';
  const newBalance = isIncome ? currentBalance + transactionAmount : currentBalance - transactionAmount;

  // Update Wallet Balance
  await supabase
    .from('wallets')
    .update({ balance: newBalance })
    .eq('id', defaultWallet.id);

  // Insert Transaction
  const nowStr = new Date().toISOString();
  await supabase
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
    });

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
      budgetUsedMonth = monthTxs.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
    }
  }

  // 5. Append to Google Sheet (if configured)
  const isPro = (profile.plan || '').toLowerCase() === 'pro';
  if (isPro && profile.google_sheet_id) {
    const nowWIB = new Date();
    const dateYMD = nowWIB.toISOString().split('T')[0];
    const timeHHMM = nowWIB.toTimeString().split(' ')[0].substring(0, 5);

    if (parsed.items && parsed.items.length > 0) {
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
    if (isPro && monthlyBudget > 0 && budgetUsedMonth > monthlyBudget * 0.8) {
      const advisorMsg = await generateAIAdvisorMessage(profile.full_name, categoryName);
      await sendTelegramMessage(botToken, chatId, advisorMsg);
    }
  }
}
