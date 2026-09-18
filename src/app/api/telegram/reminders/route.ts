import { NextResponse } from 'next/server';
import { supabaseAdmin, supabaseUrl } from '@/lib/supabase';
import { decrypt } from '@/lib/crypto';
import { sendMessage } from '@/lib/telegram';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const isPlaceholder = !supabaseUrl || 
      supabaseUrl.includes('your-supabase-project-id') || 
      supabaseUrl.includes('placeholder-project');

    if (isPlaceholder) {
      return NextResponse.json({
        success: true,
        reminder: {
          active: true,
          frequency: '1',
          times: ['19:00']
        }
      });
    }

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('reminder_active, reminder_frequency, reminder_times')
      .eq('id', userId)
      .maybeSingle();

    if (error || !profile) {
      return NextResponse.json({
        success: true,
        reminder: {
          active: false,
          frequency: '1',
          times: ['19:00']
        }
      });
    }

    return NextResponse.json({
      success: true,
      reminder: {
        active: !!profile.reminder_active,
        frequency: profile.reminder_frequency || '1',
        times: profile.reminder_times || ['19:00']
      }
    });
  } catch (err: any) {
    console.error('Fetch reminder error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, active, frequency, times, sendTest } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const isPlaceholder = !supabaseUrl || 
      supabaseUrl.includes('your-supabase-project-id') || 
      supabaseUrl.includes('placeholder-project');

    let botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    let chatId: string | number | null = null;
    let userName = 'Nasabah';

    if (!isPlaceholder) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profile) {
        userName = profile.full_name || 'Nasabah';
        if (profile.telegram_chat_id) chatId = profile.telegram_chat_id;
        if (profile.telegram_bot_token) botToken = decrypt(profile.telegram_bot_token);
      }

      // Update reminder settings in profiles table
      try {
        await supabaseAdmin
          .from('profiles')
          .update({
            reminder_active: !!active,
            reminder_frequency: frequency || '1',
            reminder_times: times || ['19:00']
          })
          .eq('id', userId);
      } catch (dbErr) {
        console.warn('Could not update reminder in DB:', dbErr);
      }
    } else {
      try {
        const fallbackPath = path.join(process.cwd(), 'src/lib/ai_config_fallback.json');
        if (fs.existsSync(fallbackPath)) {
          const parsed = JSON.parse(fs.readFileSync(fallbackPath, 'utf-8'));
          if (parsed && parsed.botToken) botToken = parsed.botToken;
        }
        const mockChatsFile = path.join(process.cwd(), 'src/lib/mock_chats.json');
        if (fs.existsSync(mockChatsFile)) {
          const chats = JSON.parse(fs.readFileSync(mockChatsFile, 'utf-8'));
          chatId = chats[userId] || Object.values(chats)[0] || null;
        }
      } catch (e) {}
    }

    const keyboardMarkup = {
      keyboard: [
        [ { text: '/saldo' }, { text: '/budget' } ],
        [ { text: '/hari_ini' }, { text: '/sheet' } ],
        [ { text: '/bantuan' } ]
      ],
      resize_keyboard: true,
      one_time_keyboard: false
    };

    let telegramSent = false;
    let telegramError = '';

    // If sendTest is requested or if user just enabled reminder
    if ((sendTest || active) && botToken && chatId) {
      try {
        const timeStr = Array.isArray(times) ? times.join(' & ') : (times || '19:00');
        const reminderMsg = sendTest
          ? `🔔 <b>Tes Notifikasi Pengingat Berhasil!</b>\n\n` +
            `Halo <b>${userName}</b>, fitur pengingat Telegram Anda aktif 100%!\n` +
            `Jadwal Pengingat: <b>Pukul ${timeStr} WIB</b> (${frequency === '2' ? '2x Sehari' : '1x Sehari'}).\n\n` +
            `💡 <i>Jangan lupa catat transaksi hari ini agar cashflow Anda tetap rapi.</i>\n` +
            `Contoh: <code>beli makan 25rb</code> atau ketik /hari_ini untuk rekap.`
          : `⏰ <b>Pengingat Harian Diaktifkan!</b>\n\n` +
            `Halo <b>${userName}</b>, jadwal pengingat pencatatan keuangan Anda telah diset pada pukul <b>${timeStr} WIB</b> (${frequency === '2' ? '2x Sehari' : '1x Sehari'}).\n\n` +
            `Bot akan otomatis mengingatkan Anda untuk mencatat pengeluaran harian! 🚀`;

        await sendMessage(botToken, Number(chatId), reminderMsg, keyboardMarkup);
        telegramSent = true;
      } catch (tErr: any) {
        console.error('Failed to send telegram reminder message:', tErr);
        telegramError = tErr.message || 'Telegram send error';
      }
    }

    return NextResponse.json({
      success: true,
      message: active 
        ? (sendTest ? 'Tes notifikasi pengingat berhasil dikirim ke Telegram!' : 'Pengaturan pengingat berhasil disimpan dan diaktifkan di Telegram!')
        : 'Pengingat harian telah dinonaktifkan.',
      telegramSent,
      telegramError: telegramError || undefined
    });
  } catch (err: any) {
    console.error('Save reminder error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
