import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { decrypt } from '@/lib/crypto';
import * as telegram from '@/lib/telegram';
import * as ai from '@/lib/ai';
import fs from 'fs';
import path from 'path';

const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
const SUPERADMIN_ID = '58c09700-965d-4104-a344-6e599c46deff';

// Date Helper for WIB
function getFormattedWIBDate(dateInput?: Date | string) {
  const date = dateInput ? new Date(dateInput) : new Date();
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  
  // Format date in Asia/Jakarta timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
    hour12: false
  });
  
  const parts = formatter.formatToParts(date);
  const partMap: Record<string, string> = {};
  parts.forEach(p => {
    partMap[p.type] = p.value;
  });
  
  const year = parseInt(partMap.year);
  const month = parseInt(partMap.month) - 1;
  const day = parseInt(partMap.day);
  const hour = partMap.hour.padStart(2, '0');
  const minute = partMap.minute.padStart(2, '0');
  
  const wibDate = new Date(year, month, day);
  const dayName = days[wibDate.getDay()];
  const monthName = months[wibDate.getMonth()];
  
  return `${dayName}, ${day} ${monthName} ${year} — ${hour}:${minute} WIB`;
}

// Visual Progress Bar Helper
function generateProgressBar(percentage: number) {
  const rounded = Math.min(Math.max(Math.round(percentage / 10), 0), 10);
  const filled = '█'.repeat(rounded);
  const empty = '░'.repeat(10 - rounded);
  return `${filled}${empty}`;
}

export async function POST(request: Request) {
  let botToken = process.env.TELEGRAM_BOT_TOKEN || '';
  
  const keyboardMarkup = {
    keyboard: [
      [ { text: '/saldo' }, { text: '/budget' } ],
      [ { text: '/hari_ini' }, { text: '/sheet' } ],
      [ { text: '/bantuan' } ]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  };
  
  try {
    const url = new URL(request.url);
    const queryUserId = url.searchParams.get('user_id');
    const queryBotToken = url.searchParams.get('bot_token');
    const update = await request.json();
    
    if (queryBotToken) {
      botToken = queryBotToken;
    }
    
    const updateId = update.update_id;
    const message = update.message || update.edited_message;
    
    if (!message) {
      return NextResponse.json({ ok: true });
    }
    
    const chatId = message.chat.id;
    
    // 1. Idempotency Check
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const isPlaceholder = !supabaseUrl || 
      supabaseUrl.includes('your-supabase-project-id') || 
      supabaseUrl.includes('placeholder-project');

    if (!isPlaceholder) {
      const { error: idempotencyError } = await supabaseAdmin
        .from('processed_telegram_updates')
        .insert({ id: updateId });
        
      if (idempotencyError) {
        console.log(`Telegram Update ID ${updateId} already processed.`);
        return NextResponse.json({ ok: true });
      }
    } else {
      const globalRef = global as any;
      if (!globalRef.processedMockUpdates) {
        globalRef.processedMockUpdates = new Set<number>();
      }
      const processed = globalRef.processedMockUpdates;
      if (processed.has(updateId)) {
        console.log(`Telegram Update ID ${updateId} already processed (mock).`);
        return NextResponse.json({ ok: true });
      }
      processed.add(updateId);
      if (processed.size > 1000) {
        processed.delete(processed.values().next().value);
      }
    }
    
    // 2. Resolve User & Bot Token
    let userProfile: any = null;
    
    if (isPlaceholder) {
      if (!queryBotToken) {
        try {
          const fallbackPath = path.join(process.cwd(), 'src/lib/ai_config_fallback.json');
          if (fs.existsSync(fallbackPath)) {
            const parsed = JSON.parse(fs.readFileSync(fallbackPath, 'utf-8'));
            if (parsed && parsed.botToken) {
              botToken = parsed.botToken;
            }
          }
        } catch (e) {}
      }

      const mockChatsFile = path.join(process.cwd(), 'src/lib/mock_chats.json');
      let chats: Record<string, string> = {};
      if (fs.existsSync(mockChatsFile)) {
        try {
          chats = JSON.parse(fs.readFileSync(mockChatsFile, 'utf-8'));
        } catch (e) {}
      }
      
      const targetUserId = queryUserId || Object.keys(chats).find(k => chats[k] === String(chatId)) || 'usr_admin';
      
      userProfile = {
        id: targetUserId,
        full_name: targetUserId === 'usr_admin' ? 'Super Admin' : targetUserId === 'usr_budi' ? 'Budi Santoso' : 'Demo User',
        plan: 'Pro',
        telegram_chat_id: String(chatId),
        monthly_transaction_limit: 1000
      };
    } else {
      const targetUserId = (queryUserId && isUUID(queryUserId)) ? queryUserId : SUPERADMIN_ID;
      if (queryUserId) {
        // BYOB: private bot config (lookup by query param user_id)
        const { data } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('id', targetUserId)
          .maybeSingle();
        userProfile = data;
        
        if (userProfile && userProfile.telegram_bot_token) {
          botToken = decrypt(userProfile.telegram_bot_token);
        }
      } else {
        // Shared bot config (lookup by telegram_chat_id)
        const { data } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('telegram_chat_id', chatId)
          .maybeSingle();
        userProfile = data;
      }
    }
    
    // 3. Handle Linking / Pairing Command
    const textContent = (message.text || '').trim();
    if (textContent.startsWith('/start')) {
      const parts = textContent.split(' ');
      const token = parts[1]; // TD-XXXXXX
      
      if (token && token.startsWith('TD-')) {
        if (isPlaceholder) {
          const mockChatsFile = path.join(process.cwd(), 'src/lib/mock_chats.json');
          let chats: Record<string, string> = {};
          if (fs.existsSync(mockChatsFile)) {
            try {
              chats = JSON.parse(fs.readFileSync(mockChatsFile, 'utf-8'));
            } catch (e) {}
          }
          chats[queryUserId || 'usr_admin'] = String(chatId);
          fs.writeFileSync(mockChatsFile, JSON.stringify(chats, null, 2));
          
          await telegram.sendMessage(
            botToken,
            chatId,
            `🟢 <b>Mencatat Aja (Mock Mode) Berhasil Terhubung!</b>\nHalo, akun Anda berhasil terhubung dengan Telegram bot kustom di Localhost.\n\nSekarang Anda bisa mulai mencatat keuangan. Cukup ketik seperti:\n• <i>"beli bakso 15rb"</i>\n• <i>"gaji freelance 2.5jt"</i>\n• <i>"transfer kasir ke dompet BCA 500k"</i>\n\nKetik /bantuan untuk melihat daftar perintah.`,
            keyboardMarkup
          );
          return NextResponse.json({ ok: true });
        }

        // Find profile with this link token
        const { data: linkProfile, error: linkError } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('telegram_link_token', token)
          .maybeSingle();
          
        if (linkError || !linkProfile) {
          await telegram.sendMessage(botToken, chatId, '❌ <b>Token tidak valid atau sudah kedaluwarsa.</b>\nSilakan cek token terbaru di Settings Dashboard Mencatat Aja.');
          return NextResponse.json({ ok: true });
        }
        
        // Link the telegram chat id to profile
        const { error: updateProfileErr } = await supabaseAdmin
          .from('profiles')
          .update({ telegram_chat_id: chatId })
          .eq('id', linkProfile.id);
          
        if (updateProfileErr) {
          await telegram.sendMessage(botToken, chatId, '❌ <b>Gagal menghubungkan akun.</b> Silakan coba lagi nanti.');
          return NextResponse.json({ ok: true });
        }
        
        await telegram.sendMessage(
          botToken,
          chatId,
          `🟢 <b>Mencatat Aja Berhasil Terhubung!</b>\nHalo <b>${linkProfile.full_name || 'Nasabah'}</b>, akun kamu berhasil terhubung dengan Telegram bot ini.\n\nSekarang kamu bisa mulai mencatat pemasukan dan pengeluaran kamu kapan saja. Cukup ketik seperti:\n• <i>"beli bakso 15rb"</i>\n• <i>"gajian freelance 2.5jt"</i>\n• <i>"transfer kasir ke dompet BCA 500k"</i>\n\nKetik /bantuan untuk melihat daftar perintah.`,
          keyboardMarkup
        );
        return NextResponse.json({ ok: true });
      }
    }
    
    if (!isPlaceholder) {
      const targetUserId = (queryUserId && isUUID(queryUserId)) ? queryUserId : SUPERADMIN_ID;
      if (queryUserId) {
        let activeBotToken: string | null = null;
        if (userProfile && userProfile.telegram_bot_token) {
          activeBotToken = decrypt(userProfile.telegram_bot_token);
        }

        const resolvedToken = queryBotToken || activeBotToken;
        if (!resolvedToken) {
          console.log(`No valid bot token for user ${queryUserId}, ignoring.`);
          return NextResponse.json({ ok: true });
        }

        botToken = resolvedToken;

        // Auto-sync profile bot token if queryBotToken is provided
        if (queryBotToken && (!activeBotToken || activeBotToken !== queryBotToken)) {
          try {
            const { encrypt } = await import('@/lib/crypto');
            await supabaseAdmin
              .from('profiles')
              .update({ telegram_bot_token: encrypt(queryBotToken) })
              .eq('id', targetUserId);
          } catch (e) {}
        }
        
        // If telegram_chat_id is missing or updated, pair it automatically now
        if (!userProfile?.telegram_chat_id || String(userProfile.telegram_chat_id) !== String(chatId)) {
          console.log(`Pairing telegram_chat_id ${chatId} to profile ${targetUserId}...`);
          await supabaseAdmin
            .from('profiles')
            .update({ telegram_chat_id: String(chatId) })
            .eq('id', targetUserId);
          if (userProfile) {
            userProfile.telegram_chat_id = String(chatId);
          } else {
            userProfile = {
              id: targetUserId,
              full_name: message.from?.first_name || 'Nasabah',
              plan: 'Pro',
              telegram_chat_id: String(chatId),
              monthly_transaction_limit: 1000
            };
          }

          // Send Welcome Notification message to Telegram chat
          const welcomeMsg = `🚀 <b>Selamat Datang di Mencatat Aja Bot!</b> 🚀\n\n` +
            `Halo <b>${userProfile.full_name || message.from?.first_name || 'Nasabah'}</b>, koneksi bot kustom Anda telah berhasil diaktifkan! Asisten keuangan AI Anda kini aktif 24/7.\n\n` +
            `📖 <b>Panduan Singkat Penggunaan:</b>\n` +
            `• <code>beli bakso 15rb</code> (Mencatat pengeluaran)\n` +
            `• <code>gaji freelance 2.5jt</code> (Mencatat pemasukan)\n` +
            `• <code>transfer dari BCA ke Gopay 500rb</code> (Mencatat transfer)\n\n` +
            `Ketik /bantuan di chat ini kapan saja untuk melihat panduan lengkap.\n` +
            `Gunakan tombol menu di bawah ini untuk pintasan cepat navigasi Anda! 👇`;
          
          await telegram.sendMessage(botToken, chatId, welcomeMsg, keyboardMarkup);

          if (textContent === '/start') {
            return NextResponse.json({ ok: true });
          }
        } else if (textContent === '/start') {
          // If already paired and user types /start
          const welcomeMsg = `🚀 <b>Selamat Datang Kembali di Mencatat Aja Bot!</b> 🚀\n\n` +
            `Halo <b>${userProfile.full_name || message.from?.first_name || 'Nasabah'}</b>, bot keuangan AI Anda aktif 24/7!\n\n` +
            `📖 <b>Panduan Singkat Penggunaan:</b>\n` +
            `• <code>beli bakso 15rb</code> (Mencatat pengeluaran)\n` +
            `• <code>gaji freelance 2.5jt</code> (Mencatat pemasukan)\n` +
            `• <code>transfer dari BCA ke Gopay 500rb</code> (Mencatat transfer)\n\n` +
            `Ketik /bantuan di chat ini kapan saja untuk melihat panduan lengkap.`;
          await telegram.sendMessage(botToken, chatId, welcomeMsg, keyboardMarkup);
          return NextResponse.json({ ok: true });
        }
      } else {
        // Shared bot mode: Must have userProfile matching telegram_chat_id
        if (!userProfile) {
          console.log(`No user profile linked for telegram_chat_id ${chatId}, ignoring non-pairing message.`);
          return NextResponse.json({ ok: true });
        }
        if (textContent === '/start') {
          const welcomeMsg = `🚀 <b>Selamat Datang Kembali di Mencatat Aja Bot!</b> 🚀\n\nHalo <b>${userProfile.full_name || 'Nasabah'}</b>! Ketik /bantuan untuk melihat panduan.`;
          await telegram.sendMessage(botToken, chatId, welcomeMsg, keyboardMarkup);
          return NextResponse.json({ ok: true });
        }
      }
    }

    // Ensure botToken is resolved if empty
    if (!botToken) {
      try {
        const fallbackPath = path.join(process.cwd(), 'src/lib/ai_config_fallback.json');
        if (fs.existsSync(fallbackPath)) {
          const parsed = JSON.parse(fs.readFileSync(fallbackPath, 'utf-8'));
          if (parsed && parsed.botToken) {
            botToken = parsed.botToken;
          }
        }
      } catch (e) {}
    }

    if (!userProfile) {
      userProfile = {
        id: queryUserId || 'usr_ricky_superadmin',
        full_name: 'Nasabah',
        plan: 'Pro',
        telegram_chat_id: String(chatId),
        monthly_transaction_limit: 1000
      };
    }
    
    // 4. Check Plan Limits before recording transactions
    const now = new Date();
    let txCount = 0;
    if (!isPlaceholder) {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      
      const { count, error: countErr } = await supabaseAdmin
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userProfile.id)
        .gte('transaction_date', startOfMonth);
        
      if (countErr) {
        console.error('Failed to query transaction count:', countErr);
      }
      txCount = count || 0;
    } else {
      const mockTxsFile = path.join(process.cwd(), 'src/lib/mock_transactions.json');
      if (fs.existsSync(mockTxsFile)) {
        try {
          const raw = fs.readFileSync(mockTxsFile, 'utf-8');
          const all = JSON.parse(raw);
          if (Array.isArray(all)) {
            txCount = all.filter((t: any) => t.user_id === userProfile.id).length;
          }
        } catch (e) {}
      }
    }
    
    if (userProfile.plan === 'Starter' && txCount >= userProfile.monthly_transaction_limit) {
      await telegram.sendMessage(
        botToken,
        chatId,
        `⚠️ <b>Batas Transaksi Bulanan Tercapai!</b>\n\nKamu sudah mencatat ${txCount} transaksi bulan ini. Paket <b>Starter</b> dibatasi maksimal ${userProfile.monthly_transaction_limit} transaksi per bulan.\n\nSilakan upgrade ke paket <b>Pro</b> di dashboard web untuk menikmati pencatatan transaksi tanpa batas, input foto struk, dan asisten keuangan AI! 🚀`
      );
      return NextResponse.json({ ok: true });
    }
    
    // 5. Fetch default wallet and categories for transaction insertion
    let wallets: any[] = [];
    let categories: any[] = [];
    
    if (isPlaceholder) {
      const mockWalletsFile = path.join(process.cwd(), 'src/lib/mock_wallets.json');
      if (fs.existsSync(mockWalletsFile)) {
        try {
          const raw = fs.readFileSync(mockWalletsFile, 'utf-8');
          const all = JSON.parse(raw);
          if (Array.isArray(all)) {
            wallets = all.filter((w: any) => w.user_id === userProfile.id);
          }
        } catch (e) {}
      }
      
      if (wallets.length === 0) {
        wallets = [
          {
            id: `w_bca_${userProfile.id}`,
            user_id: userProfile.id,
            name: 'BCA',
            balance: 80000000,
            is_default: true,
            created_at: new Date().toISOString()
          },
          {
            id: `w_cash_${userProfile.id}`,
            user_id: userProfile.id,
            name: 'Cash',
            balance: 1500000,
            is_default: false,
            created_at: new Date().toISOString()
          }
        ];
        
        try {
          let all: any[] = [];
          if (fs.existsSync(mockWalletsFile)) {
            all = JSON.parse(fs.readFileSync(mockWalletsFile, 'utf-8'));
          }
          all = [...all, ...wallets];
          fs.writeFileSync(mockWalletsFile, JSON.stringify(all, null, 2));
        } catch (e) {}
      }

      categories = [
        { id: 'c1', name: 'Makanan', emoji: '🍜', type: 'expense' },
        { id: 'c2', name: 'Transport', emoji: '🚗', type: 'expense' },
        { id: 'c3', name: 'Hiburan', emoji: '🎮', type: 'expense' },
        { id: 'c4', name: 'Tagihan', emoji: '🏠', type: 'expense' },
        { id: 'c5', name: 'Belanja', emoji: '👕', type: 'expense' },
        { id: 'c6', name: 'Gaji', emoji: '💼', type: 'income' },
        { id: 'c7', name: 'Bonus', emoji: '🎁', type: 'income' },
        { id: 'c8', name: 'Freelance', emoji: '💻', type: 'income' },
        { id: 'c9', name: 'Investasi', emoji: '📈', type: 'income' },
        { id: 'c10', name: 'Lainnya', emoji: '📦', type: 'expense' }
      ];
    } else {
      const { data: wData } = await supabaseAdmin
        .from('wallets')
        .select('*')
        .eq('user_id', userProfile.id);
      wallets = wData || [];
      
      const { data: cData } = await supabaseAdmin
        .from('categories')
        .select('*')
        .or(`user_id.eq.${userProfile.id},user_id.is.null`);
      categories = cData || [];
    }

    // Auto-provision default wallets if user has no wallets
    if (!wallets || wallets.length === 0) {
      if (!isPlaceholder) {
        try {
          const { data: createdWallets } = await supabaseAdmin
            .from('wallets')
            .insert([
              { user_id: userProfile.id, name: 'BCA', balance: 0, is_default: true },
              { user_id: userProfile.id, name: 'Cash', balance: 0, is_default: false }
            ])
            .select('*');
          if (createdWallets && createdWallets.length > 0) {
            wallets = createdWallets;
          }
        } catch (e) {
          console.warn('Failed to auto-provision wallets in Supabase:', e);
        }
      }
      
      if (!wallets || wallets.length === 0) {
        wallets = [
          {
            id: `w_bca_${userProfile.id}`,
            user_id: userProfile.id,
            name: 'BCA',
            balance: 0,
            is_default: true,
            created_at: new Date().toISOString()
          },
          {
            id: `w_cash_${userProfile.id}`,
            user_id: userProfile.id,
            name: 'Cash',
            balance: 0,
            is_default: false,
            created_at: new Date().toISOString()
          }
        ];
        try {
          const mockWalletsFile = path.join(process.cwd(), 'src/lib/mock_wallets.json');
          let all: any[] = [];
          if (fs.existsSync(mockWalletsFile)) {
            all = JSON.parse(fs.readFileSync(mockWalletsFile, 'utf-8'));
          }
          all = [...all, ...wallets];
          fs.writeFileSync(mockWalletsFile, JSON.stringify(all, null, 2));
        } catch (e) {}
      }
    }

    if (!categories || categories.length === 0) {
      categories = [
        { id: 'c1', name: 'Makanan', emoji: '🍜', type: 'expense' },
        { id: 'c2', name: 'Transport', emoji: '🚗', type: 'expense' },
        { id: 'c3', name: 'Hiburan', emoji: '🎮', type: 'expense' },
        { id: 'c4', name: 'Tagihan', emoji: '🏠', type: 'expense' },
        { id: 'c5', name: 'Belanja', emoji: '👕', type: 'expense' },
        { id: 'c6', name: 'Gaji', emoji: '💼', type: 'income' },
        { id: 'c7', name: 'Bonus', emoji: '🎁', type: 'income' },
        { id: 'c8', name: 'Freelance', emoji: '💻', type: 'income' },
        { id: 'c9', name: 'Investasi', emoji: '📈', type: 'income' },
        { id: 'c10', name: 'Lainnya', emoji: '📦', type: 'expense' }
      ];
    }

    const defaultWallet = wallets.find(w => w.is_default) || wallets[0];
      
    // 6. HANDLE COMMANDS
    if (textContent.startsWith('/')) {
      const command = textContent.split(' ')[0].toLowerCase();
      
      if (command === '/start' || command === '/bantuan') {
        const welcomeText = `🚀 <b>Selamat Datang di Mencatat Aja Bot!</b> 🚀\n` +
          `Asisten keuangan berbasis AI yang mencatat pengeluaran semudah berkirim chat.\n\n` +
          `📖 <b>Panduan Penggunaan Lengkap:</b>\n\n` +
          `1️⃣ <b>Pencatatan Default (Menggunakan Dompet Utama):</b>\n` +
          `Cukup sebutkan <b>nama barang/jasa</b> dan <b>nominalnya</b>. AI akan mendeteksi kategori dan memotong dompet default Anda secara otomatis.\n` +
          `📝 <i>Contoh:</i>\n` +
          `• <code>beli bakso 15rb</code> (Kategori: Makanan)\n` +
          `• <code>jajan kopi starbucks 45.000</code> (Kategori: Makanan)\n` +
          `• <code>gaji bulanan masuk 8jt</code> (Kategori: Gaji)\n\n` +
          `2️⃣ <b>Mencatat dengan Spesifik Dompet / Sumber Dana:</b>\n` +
          `Tambahkan nama dompet/rekening Anda di dalam pesan. Sangat disarankan agar pencatatan di dashboard Anda lebih rapi!\n` +
          `📝 <i>Contoh:</i>\n` +
          `• <code>beli bensin 20.000 pakai gopay</code> (Mengurangi dompet Gopay)\n` +
          `• <code>bayar kosan 1.5jt lewat BCA</code> (Mengurangi dompet BCA)\n` +
          `• <code>belanja baju 150rb cash</code> (Mengurangi dompet Cash)\n\n` +
          `3️⃣ <b>Melakukan Transfer Antar Dompet:</b>\n` +
          `Gunakan kata "transfer" diikuti nominal dan nama dompet pengirim/penerima.\n` +
          `📝 <i>Contoh:</i>\n` +
          `• <code>transfer dari BCA ke Gopay 500rb</code>\n\n` +
          `📋 <b>Perintah Navigasi:</b>\n` +
          `• /saldo - Cek saldo semua dompet Anda secara real-time\n` +
          `• /hari_ini - Rekap pengeluaran & pemasukan hari ini\n` +
          `• /budget - Cek sisa kuota anggaran/limit belanja kategori\n` +
          `• /sheet - Dapatkan link akses cepat ke Web Dashboard Anda\n` +
          `• /bantuan - Tampilkan petunjuk ini kembali\n\n` +
          `🎙️ <b>Voice Note & Gambar (Paket Pro):</b>\n` +
          `• Kirimkan <i>Voice Note</i> (maksimal 60 detik) membacakan transaksi Anda.\n` +
          `• Kirimkan foto struk/nota belanja Anda untuk deteksi instan oleh AI.`;
        await telegram.sendMessage(botToken, chatId, welcomeText, keyboardMarkup);
        return NextResponse.json({ ok: true });
      }
      
      if (command === '/saldo') {
        if (!wallets || wallets.length === 0) {
          await telegram.sendMessage(botToken, chatId, '👛 Kamu belum memiliki dompet aktif.');
          return NextResponse.json({ ok: true });
        }
        let reply = '👛 <b>Saldo Dompet Aktif:</b>\n\n';
        let total = 0;
        wallets.forEach(w => {
          reply += `• ${w.name}: Rp ${Number(w.balance).toLocaleString('id-ID')}\n`;
          total += Number(w.balance);
        });
        reply += `\n💵 <b>Total Saldo:</b> Rp ${total.toLocaleString('id-ID')}`;
        await telegram.sendMessage(botToken, chatId, reply);
        return NextResponse.json({ ok: true });
      }
      
      if (command === '/sheet' || command === '/dashboard') {
        const dashboardUrl = `${process.env.WEBHOOK_BASE_URL || 'https://www.mencatat.my.id'}/dashboard`;
        await telegram.sendMessage(
          botToken,
          chatId,
          `📊 <b>Dashboard Mencatat Aja Anda:</b>\nSilakan klik tautan berikut untuk membuka dashboard web dan laporan lengkap Anda:\n\n👉 <a href="${dashboardUrl}">${dashboardUrl}</a>`
        );
        return NextResponse.json({ ok: true });
      }
      
      if (command === '/hari_ini') {
        const todayStr = new Date();
        todayStr.setHours(0,0,0,0);
        
        let todayTx: any[] = [];
        if (!isPlaceholder) {
          const { data } = await supabaseAdmin
            .from('transactions')
            .select('*, categories(name, emoji)')
            .eq('user_id', userProfile.id)
            .gte('transaction_date', todayStr.toISOString());
          todayTx = data || [];
        } else {
          const mockTxsFile = path.join(process.cwd(), 'src/lib/mock_transactions.json');
          if (fs.existsSync(mockTxsFile)) {
            try {
              const raw = fs.readFileSync(mockTxsFile, 'utf-8');
              const all = JSON.parse(raw);
              if (Array.isArray(all)) {
                const startLimit = todayStr.getTime();
                todayTx = all.filter((t: any) => t.user_id === userProfile.id && new Date(t.transaction_date).getTime() >= startLimit);
                todayTx = todayTx.map(t => {
                  const cat = categories.find(c => c.id === t.category_id);
                  return {
                    ...t,
                    categories: cat ? { name: cat.name, emoji: cat.emoji } : null
                  };
                });
              }
            } catch (e) {}
          }
        }
          
        if (!todayTx || todayTx.length === 0) {
          await telegram.sendMessage(botToken, chatId, '📅 Belum ada transaksi yang dicatat hari ini.');
          return NextResponse.json({ ok: true });
        }
        
        let out = `📅 <b>Transaksi Hari Ini:</b>\n\n`;
        let income = 0;
        let expense = 0;
        todayTx.forEach(t => {
          const formattedAmt = `Rp ${Number(t.amount).toLocaleString('id-ID')}`;
          if (t.type === 'expense') {
            out += `💸 ${t.categories?.emoji || '💰'} ${t.categories?.name || 'Lainnya'}: -${formattedAmt} (${t.description})\n`;
            expense += Number(t.amount);
          } else if (t.type === 'income') {
            out += `💰 ${t.categories?.emoji || '💼'} ${t.categories?.name || 'Gaji'}: +${formattedAmt} (${t.description})\n`;
            income += Number(t.amount);
          } else {
            out += `🔄 Transfer: ${formattedAmt} (${t.description})\n`;
          }
        });
        out += `\n📊 <b>Ringkasan:</b>\nPemasukan: +Rp ${income.toLocaleString('id-ID')}\nPengeluaran: -Rp ${expense.toLocaleString('id-ID')}`;
        await telegram.sendMessage(botToken, chatId, out);
        return NextResponse.json({ ok: true });
      }

      if (command === '/budget') {
        const currentPeriod = toYearMonth(now);
        let budgetsList: any[] = [];
        if (!isPlaceholder) {
          const { data } = await supabaseAdmin
            .from('budgets')
            .select('*, categories(name, emoji)')
            .eq('user_id', userProfile.id)
            .eq('period', currentPeriod);
          budgetsList = data || [];
        } else {
          const mockBudgetsFile = path.join(process.cwd(), 'src/lib/mock_budgets.json');
          if (fs.existsSync(mockBudgetsFile)) {
            try {
              const raw = fs.readFileSync(mockBudgetsFile, 'utf-8');
              const all = JSON.parse(raw);
              if (Array.isArray(all)) {
                budgetsList = all.filter(b => b.user_id === userProfile.id && b.period === currentPeriod);
                budgetsList = budgetsList.map(b => {
                  const cat = categories.find(c => c.id === b.category_id);
                  return {
                    ...b,
                    categories: cat ? { name: cat.name, emoji: cat.emoji } : null
                  };
                });
              }
            } catch (e) {}
          }
        }
          
        if (!budgetsList || budgetsList.length === 0) {
          await telegram.sendMessage(botToken, chatId, '🎯 Belum ada anggaran belanja (budget) yang diatur untuk bulan ini.');
          return NextResponse.json({ ok: true });
        }
        
        let out = `🎯 <b>Status Anggaran Belanja Bulan Ini:</b>\n\n`;
        budgetsList.forEach(b => {
          const limit = Number(b.monthly_limit);
          if (limit <= 0) return;
          const spent = Number(b.current_spent);
          const pct = Math.round((spent / limit) * 100);
          const sisa = limit - spent;
          const bar = generateProgressBar(pct);
          out += `${b.categories?.emoji || '📦'} <b>${b.categories?.name}</b> (${pct}%)\n`;
          out += `${bar}\nSisa: Rp ${sisa.toLocaleString('id-ID')} / Limit: Rp ${limit.toLocaleString('id-ID')}\n\n`;
        });
        await telegram.sendMessage(botToken, chatId, out);
        return NextResponse.json({ ok: true });
      }
      
      // Generic command fallback
      await telegram.sendMessage(botToken, chatId, '⚠️ Perintah tidak dikenali. Ketik /bantuan untuk melihat bantuan.');
      return NextResponse.json({ ok: true });
    }
    
    // 7. VOICE NOTES PROCESSING
    if (message.voice) {
      const voice = message.voice;
      
      if (voice.duration > 60) {
        await telegram.sendMessage(botToken, chatId, '🎙️ <b>Rekaman suara terlalu panjang.</b>\nMaksimal durasi voice note adalah 60 detik demi menjaga biaya & kecepatan pemrosesan AI.');
        return NextResponse.json({ ok: true });
      }
      
      await telegram.sendMessage(botToken, chatId, '🎙️ <i>Mendengar rekaman suaramu... Sedang memproses...</i>');
      
      try {
        const filePath = await telegram.getFile(botToken, voice.file_id);
        const fileBuffer = await telegram.downloadFile(botToken, filePath);
        
        // Transcribe
        const transcript = await ai.transcribeAudio(fileBuffer, voice.mime_type, userProfile.id);
        
        if (!transcript || transcript.trim().length === 0) {
          await telegram.sendMessage(botToken, chatId, '⚠️ AI gagal mendengar suaramu dengan jelas. Harap rekam kembali dengan lebih dekat ke mikrofon atau ketik secara manual.');
          return NextResponse.json({ ok: true });
        }
        
        // Now parse transcript text
        const parsed = await ai.parseTransactionText(transcript, categories || [], wallets?.map(w => w.name) || [], userProfile.id);
        
        // Save and reply
        await processAndReplyTransaction(parsed, userProfile, defaultWallet, categories || [], botToken, chatId, transcript);
      } catch (err: any) {
        console.error('Voice note processing error:', err);
        await telegram.sendMessage(botToken, chatId, `⚠️ Gagal memproses rekaman suara: ${err.message || 'Error tidak diketahui'}.\n\nSilakan coba kirim dalam format pesan teks biasa atau hubungkan API Key AI kustom di Pengaturan Admin.`);
      }
      return NextResponse.json({ ok: true });
    }
    
    // 8. IMAGE / PHOTO PROCESSING (OCR Struk)
    if (message.photo) {
      if (userProfile.plan === 'Starter') {
        await telegram.sendMessage(
          botToken,
          chatId,
          '⚠️ <b>Fitur Foto Struk khusus Pro!</b>\n\nFitur membaca struk belanja menggunakan AI Vision hanya tersedia pada paket Pro.\n\nSilakan upgrade ke paket Pro di dashboard web Mencatat Aja untuk menikmati kemudahan ini! 📸'
        );
        return NextResponse.json({ ok: true });
      }
      
      await telegram.sendMessage(botToken, chatId, '📸 <i>Menganalisis struk belanjamu... Mohon tunggu sebentar...</i>');
      
      // Get highest resolution photo
      const photoArray = message.photo;
      const bestPhoto = photoArray[photoArray.length - 1];
      
      const filePath = await telegram.getFile(botToken, bestPhoto.file_id);
      const fileBuffer = await telegram.downloadFile(botToken, filePath);
      const mimeType = 'image/jpeg'; // Telegram photos are generally jpeg
      
      const parsedReceipt = await ai.parseReceiptImage(fileBuffer, mimeType, categories || [], userProfile.id);
      
      // Save Receipt as 1 Transaction with sub-items
      let savedTx: any = null;
      let updatedWalletBalance = Number(defaultWallet.balance || 0);

      if (isPlaceholder) {
        savedTx = {
          id: `tx_receipt_${Date.now()}`,
          user_id: userProfile.id,
          wallet_id: defaultWallet.id,
          category_id: categories?.find(c => c.name === 'Belanja')?.id || categories?.[0]?.id,
          amount: parsedReceipt.total,
          type: 'expense',
          description: `Struk: ${parsedReceipt.merchant}`,
          transaction_date: new Date(parsedReceipt.date || Date.now()).toISOString(),
          ocr_structured_data: parsedReceipt,
          source: 'telegram'
        };
        try {
          const mockTxsFile = path.join(process.cwd(), 'src/lib/mock_transactions.json');
          let allTxs: any[] = [];
          if (fs.existsSync(mockTxsFile)) {
            allTxs = JSON.parse(fs.readFileSync(mockTxsFile, 'utf-8'));
          }
          allTxs.unshift(savedTx);
          fs.writeFileSync(mockTxsFile, JSON.stringify(allTxs, null, 2));

          const mockWalletsFile = path.join(process.cwd(), 'src/lib/mock_wallets.json');
          if (fs.existsSync(mockWalletsFile)) {
            let allW = JSON.parse(fs.readFileSync(mockWalletsFile, 'utf-8'));
            updatedWalletBalance = Number(defaultWallet.balance || 0) - Number(parsedReceipt.total || 0);
            allW = allW.map((w: any) => {
              if (w.user_id === userProfile.id && (w.id === defaultWallet.id || w.name === defaultWallet.name)) {
                return { ...w, balance: updatedWalletBalance };
              }
              return w;
            });
            fs.writeFileSync(mockWalletsFile, JSON.stringify(allW, null, 2));
          }
        } catch (e) {}
      } else {
        const { data: dbSavedTx, error: txErr } = await supabaseAdmin
          .from('transactions')
          .insert({
            user_id: userProfile.id,
            wallet_id: defaultWallet.id,
            category_id: categories?.find(c => c.name === 'Belanja')?.id || categories?.[0]?.id,
            amount: parsedReceipt.total,
            type: 'expense',
            description: `Struk: ${parsedReceipt.merchant}`,
            transaction_date: new Date(parsedReceipt.date).toISOString(),
            ocr_structured_data: parsedReceipt,
            source: 'telegram'
          })
          .select()
          .single();
          
        if (!txErr && dbSavedTx) {
          savedTx = dbSavedTx;
          if (parsedReceipt.items && parsedReceipt.items.length > 0) {
            const itemInserts = parsedReceipt.items.map((item: any) => ({
              transaction_id: savedTx.id,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              category_id: categories?.find(c => c.name === item.category)?.id || savedTx.category_id
            }));
            await supabaseAdmin.from('transaction_items').insert(itemInserts);
          }
          const { data: updatedWallet } = await supabaseAdmin
            .from('wallets')
            .select('balance')
            .eq('id', defaultWallet.id)
            .single();
          if (updatedWallet) updatedWalletBalance = updatedWallet.balance;
        } else {
          console.error('Failed to save OCR transaction to DB, fallbacking:', txErr);
          savedTx = {
            id: `tx_receipt_${Date.now()}`,
            user_id: userProfile.id,
            wallet_id: defaultWallet.id,
            category_id: categories?.find(c => c.name === 'Belanja')?.id || categories?.[0]?.id,
            amount: parsedReceipt.total,
            type: 'expense',
            description: `Struk: ${parsedReceipt.merchant}`,
            transaction_date: new Date(parsedReceipt.date || Date.now()).toISOString(),
            ocr_structured_data: parsedReceipt,
            source: 'telegram'
          };
          updatedWalletBalance = Number(defaultWallet.balance || 0) - Number(parsedReceipt.total || 0);
        }
      }
        
      // Reply
      const formattedDate = getFormattedWIBDate(savedTx.transaction_date);
      let itemsList = '';
      if (parsedReceipt.items && Array.isArray(parsedReceipt.items)) {
        parsedReceipt.items.forEach((item: any) => {
          itemsList += `├─ 📦 ${item.name} (${item.quantity}x) : Rp ${Number(item.price * item.quantity).toLocaleString('id-ID')}\n`;
        });
      }
      
      let replyText = `📅 ${formattedDate}
📸 <b>Struk belanja tercatat!</b>
├ Merchant : ${parsedReceipt.merchant}
├ Dompet   : 👛 ${defaultWallet.name}
${itemsList}└ Total    : <b>Rp ${Number(parsedReceipt.total).toLocaleString('id-ID')}</b>
└ Saldo    : Rp ${Number(updatedWalletBalance).toLocaleString('id-ID')}

<i>Rincian belanja tersimpan rapi dan bisa dilihat di menu Laporan dashboard Mencatat Aja.</i>`;

      await telegram.sendMessage(botToken, chatId, replyText);
      return NextResponse.json({ ok: true });
    }
    
    // 9. NATURAL LANGUAGE TEXT PROCESSING
    if (textContent) {
      await telegram.sendMessage(botToken, chatId, '⏳ <i>Mencatat...</i>');
      
      const parsed = await ai.parseTransactionText(
        textContent,
        categories || [],
        wallets?.map(w => w.name) || [],
        userProfile.id
      );
      
      await processAndReplyTransaction(parsed, userProfile, defaultWallet, categories || [], botToken, chatId);
    }
    
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Webhook error:', err);
    // Suppress error message return to telegram client, but notify dev
    return NextResponse.json({ ok: true }); // Always return 200 to telegram to stop retries
  }
}

// Transaction processing and reply helper
async function processAndReplyTransaction(
  parsed: any,
  userProfile: any,
  defaultWallet: any,
  categories: any[],
  botToken: string,
  chatId: number,
  transcriptText?: string
) {
  if (!parsed || parsed.amount <= 0) {
    await telegram.sendMessage(
      botToken,
      chatId,
      `⚠️ <b>AI gagal memahami maksud transaksi kamu.</b>\n\nHarap kirim pesan dengan nominal dan keterangan yang jelas.\nContoh:\n• <i>"beli bakso 15rb"</i>\n• <i>"gaji bulanan 5jt"</i>`
    );
    return;
  }
  
  // Resolve Wallet
  let targetWallet = defaultWallet;
  if (parsed.type === 'transfer' && parsed.transfer_to_wallet) {
    // If it's a transfer, we check if targetWallet matches
    // But we'll use defaults if wallets are complex
  }
  
  // Find category ID
  let categoryId = null;
  if (parsed.category) {
    categoryId = categories.find(c => c.name.toLowerCase() === parsed.category.toLowerCase())?.id;
  }
  if (!categoryId && parsed.description) {
    const descLower = parsed.description.toLowerCase();
    if (descLower.includes('bakso') || descLower.includes('baso') || descLower.includes('makan') || descLower.includes('jajan') || descLower.includes('kopi') || descLower.includes('mie') || descLower.includes('nasi') || descLower.includes('minum')) {
      categoryId = categories.find(c => c.name.toLowerCase() === 'makanan')?.id;
    } else if (descLower.includes('bensin') || descLower.includes('ojek') || descLower.includes('grab') || descLower.includes('gojek') || descLower.includes('tol') || descLower.includes('parkir')) {
      categoryId = categories.find(c => c.name.toLowerCase() === 'transport')?.id;
    } else if (descLower.includes('baju') || descLower.includes('sepatu') || descLower.includes('belanja') || descLower.includes('celana') || descLower.includes('kaos')) {
      categoryId = categories.find(c => c.name.toLowerCase() === 'belanja')?.id;
    } else if (descLower.includes('nonton') || descLower.includes('bioskop') || descLower.includes('netflix') || descLower.includes('game') || descLower.includes('main')) {
      categoryId = categories.find(c => c.name.toLowerCase() === 'hiburan')?.id;
    } else if (descLower.includes('gaji') || descLower.includes('gajian') || descLower.includes('freelance') || descLower.includes('bonus')) {
      categoryId = categories.find(c => c.name.toLowerCase() === 'gaji')?.id;
    }
  }
  if (!categoryId && parsed.type !== 'transfer') {
    // Fallback category
    categoryId = categories.find(c => c.name === 'Lainnya')?.id || categories[0]?.id;
  }
  
  // If transfer, let's look up target transfer wallet
  let transferToWalletId = null;
  if (parsed.type === 'transfer' && parsed.transfer_to_wallet) {
    const { data: trWallet } = await supabaseAdmin
      .from('wallets')
      .select('id')
      .eq('user_id', userProfile.id)
      .ilike('name', parsed.transfer_to_wallet)
      .maybeSingle();
    transferToWalletId = trWallet?.id;
  }
  
  // Insert Transaction
  let tx: any = null;
  let txError: any = null;
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const isPlaceholder = !supabaseUrl || 
    supabaseUrl.includes('your-supabase-project-id') || 
    supabaseUrl.includes('placeholder-project');

  if (isPlaceholder) {
    try {
      const webhookBaseUrl = process.env.WEBHOOK_BASE_URL || 'http://localhost:3000';
      const response = await fetch(`${webhookBaseUrl}/api/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userProfile.id,
          walletId: targetWallet.id,
          categoryId: categoryId,
          amount: parsed.amount,
          type: parsed.type,
          description: parsed.description,
          transferToWalletId: transferToWalletId,
          source: 'telegram'
        })
      });
      if (response.ok) {
        tx = await response.json();
      } else {
        txError = new Error('Failed to save mock transaction');
      }
    } catch (err: any) {
      txError = err;
    }
  } else {
    const { data, error } = await supabaseAdmin
      .from('transactions')
      .insert({
        user_id: userProfile.id,
        wallet_id: targetWallet.id,
        category_id: categoryId,
        amount: parsed.amount,
        type: parsed.type,
        description: parsed.description,
        transfer_to_wallet_id: transferToWalletId,
        source: 'telegram'
      })
      .select()
      .single();
    tx = data;
    txError = error;
  }
    
  if (txError || !tx) {
    console.error('Insert transaction error:', txError);
    await telegram.sendMessage(botToken, chatId, '❌ Gagal menyimpan transaksi. Terjadi kesalahan pada database.');
    return;
  }
  
  // Fetch updated wallets
  let updatedWallet: any = { balance: 0 };
  if (isPlaceholder) {
    const currentBal = Number(targetWallet.balance || 0);
    const amountVal = Number(parsed.amount || 0);
    const isExpense = parsed.type === 'expense';
    const isIncome = parsed.type === 'income';
    updatedWallet.balance = isExpense ? (currentBal - amountVal) : isIncome ? (currentBal + amountVal) : currentBal;
    
    try {
      const mockWalletsFile = path.join(process.cwd(), 'src/lib/mock_wallets.json');
      if (fs.existsSync(mockWalletsFile)) {
        let all = JSON.parse(fs.readFileSync(mockWalletsFile, 'utf-8'));
        if (Array.isArray(all)) {
          all = all.map((w: any) => {
            if (w.user_id === userProfile.id && (w.id === targetWallet.id || w.name === targetWallet.name)) {
              return { ...w, balance: updatedWallet.balance };
            }
            return w;
          });
          fs.writeFileSync(mockWalletsFile, JSON.stringify(all, null, 2));
        }
      }
    } catch (e) {}
  } else {
    const { data } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('id', targetWallet.id)
      .single();
    if (data) updatedWallet = data;
  }
    
  const formattedDate = getFormattedWIBDate(tx.transaction_date);
  const matchingCat = categories.find(c => c.id === categoryId);
  const formattedAmt = Number(parsed.amount).toLocaleString('id-ID');
  const formattedBal = Number(updatedWallet?.balance || 0).toLocaleString('id-ID');
  
  // Format reply according to type
  let replyText = '';
  if (parsed.type === 'expense') {
    // Query budget for visual progress
    let budget: any = null;
    if (!isPlaceholder) {
      const currentPeriod = toYearMonth(new Date());
      const { data } = await supabaseAdmin
        .from('budgets')
        .select('*')
        .eq('user_id', userProfile.id)
        .eq('category_id', categoryId)
        .eq('period', currentPeriod)
        .maybeSingle();
      budget = data;
    } else {
      try {
        const mockBudgetsFile = path.join(process.cwd(), 'src/lib/mock_budgets.json');
        if (fs.existsSync(mockBudgetsFile)) {
          const raw = fs.readFileSync(mockBudgetsFile, 'utf-8');
          const all = JSON.parse(raw);
          if (Array.isArray(all)) {
            const currentPeriod = toYearMonth(new Date());
            budget = all.find(b => b.user_id === userProfile.id && b.category_id === categoryId && b.period === currentPeriod);
          }
        }
      } catch (e) {}
    }
      
    let budgetSection = '';
    if (budget && Number(budget.monthly_limit) > 0) {
      const limit = Number(budget.monthly_limit);
      const spent = Number(budget.current_spent);
      const pct = Math.round((spent / limit) * 100);
      const sisa = limit - spent;
      const bar = generateProgressBar(pct);
      
      let motivationText = '';
      if (pct >= 100) {
        motivationText = '\n⚠️ <b>Awas! Anggaran kategori ini sudah habis!</b> 🛑';
      } else if (pct >= 80) {
        motivationText = '\n⚠️ <b>Peringatan! Anggaran kategori ini sisa kurang dari 20%!</b> ⏳';
      }
      
      budgetSection = `
📊 Budget [${matchingCat?.name || 'Kategori'}] bulan ini:
${bar} ${pct}% — sisa Rp ${sisa.toLocaleString('id-ID')}${motivationText}`;
    }
    
    replyText = `📅 ${formattedDate}
💸 <b>Pengeluaran tercatat!</b>
├ Nominal : Rp ${formattedAmt}
├ Kategori : ${matchingCat?.emoji || '💸'} ${matchingCat?.name || 'Lainnya'}
├ Dompet : 👛 ${targetWallet.name}
├ Catatan : ${parsed.description}
└ Saldo : Rp ${formattedBal}
${budgetSection}`;

  } else if (parsed.type === 'income') {
    replyText = `📅 ${formattedDate}
💰 <b>Pemasukan tercatat!</b>
├ Nominal : Rp ${formattedAmt}
├ Kategori : 💼 Pemasukan
├ Dompet : 👛 ${targetWallet.name}
└ Saldo baru : Rp ${formattedBal}

💪 Semangat terus! Jangan lupa sisihkan untuk tabungan ya.`;
  } else {
    // Transfer
    replyText = `📅 ${formattedDate}
🔄 <b>Transfer berhasil dicatat!</b>
├ Nominal : Rp ${formattedAmt}
├ Dari Dompet : 👛 ${targetWallet.name}
├ Ke Dompet : 👛 ${parsed.transfer_to_wallet || 'Tujuan'}
└ Catatan : ${parsed.description}`;
  }
  
  if (transcriptText) {
    replyText = `🎙️ Transkrip: "${transcriptText}"\n\n${replyText}`;
  }
  
  await telegram.sendMessage(botToken, chatId, replyText);
  
  // 10. AI FINANCIAL ADVISOR TRIGGERS (Pro Users Only)
  if (userProfile.plan === 'Pro' && !isPlaceholder) {
    let shouldTriggerAdvisor = false;
    let reason = '';
    
    // Condition A: Large single expense (>20% of category budget limit)
    if (parsed.type === 'expense' && categoryId) {
      const currentPeriod = toYearMonth(new Date());
      const { data: budget } = await supabaseAdmin
        .from('budgets')
        .select('*')
        .eq('user_id', userProfile.id)
        .eq('category_id', categoryId)
        .eq('period', currentPeriod)
        .maybeSingle();
        
      if (budget && Number(budget.monthly_limit) > 0) {
        const limit = Number(budget.monthly_limit);
        if (parsed.amount > limit * 0.2) {
          shouldTriggerAdvisor = true;
          reason = `Pengeluaran tunggal pada kategori "${matchingCat?.name}" sebesar Rp ${formattedAmt} melebihi 20% total anggaran bulanan kategori ini (Limit: Rp ${limit.toLocaleString('id-ID')}).`;
        }
      }
    }
    
    // Condition B: Total expenses >80% of total income this month
    if (!shouldTriggerAdvisor) {
      const currentPeriod = toYearMonth(new Date());
      const startOfMonthIso = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      
      const { data: txs } = await supabaseAdmin
        .from('transactions')
        .select('amount, type')
        .eq('user_id', userProfile.id)
        .gte('transaction_date', startOfMonthIso);
        
      if (txs) {
        const totalInc = txs.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
        const totalExp = txs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
        
        if (totalInc > 0 && totalExp > totalInc * 0.8) {
          shouldTriggerAdvisor = true;
          reason = `Total pengeluaran bulan ini (Rp ${totalExp.toLocaleString('id-ID')}) sudah mencapai lebih dari 80% dari total pemasukan bulan ini (Rp ${totalInc.toLocaleString('id-ID')}).`;
        }
      }
    }
    
    // Condition C: Expense in one category rises >50% compared to last week
    // We can skip checking C if A or B is met to keep queries optimized
    
    if (shouldTriggerAdvisor) {
      // Fetch data for advisor prompt
      const { data: lastTxs } = await supabaseAdmin
        .from('transactions')
        .select('amount, type, description, transaction_date')
        .eq('user_id', userProfile.id)
        .order('transaction_date', { ascending: false })
        .limit(15);
        
      const currentPeriod = toYearMonth(new Date());
      const { data: budgetsList } = await supabaseAdmin
        .from('budgets')
        .select('*, categories(name)')
        .eq('user_id', userProfile.id)
        .eq('period', currentPeriod);
        
      const advice = await ai.generateFinancialAdvice(
        userProfile.full_name || 'Nasabah',
        lastTxs || [],
        budgetsList || [],
        reason,
        userProfile.id
      );
      
      // Delay advice slightly for better messaging flow in Telegram
      await new Promise(resolve => setTimeout(resolve, 2000));
      await telegram.sendMessage(botToken, chatId, advice);
    }
  }
}

// Helpers
function toYearMonth(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}
