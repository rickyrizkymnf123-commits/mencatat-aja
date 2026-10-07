import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendTelegramMessage } from '@/lib/telegram';

export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient();

    // Fetch active users with reminders enabled
    const { data: users } = await supabase
      .from('profiles')
      .select('*')
      .eq('reminder_enabled', true)
      .eq('telegram_connection_status', 'connected');

    if (!users || users.length === 0) {
      return NextResponse.json({ ok: true, sent: 0 });
    }

    let count = 0;
    for (const u of users) {
      if (u.telegram_chat_id) {
        const botToken = u.telegram_bot_token || process.env.TELEGRAM_BOT_TOKEN || '';
        const msg = `⏰ *Reminder Keuangan!*
Jangan lupa catat pengeluaran hari ini ya 📝
Pencatatan rutin = keuangan lebih terkontrol 💪
Ketik transaksimu sekarang!`;
        await sendTelegramMessage(botToken, u.telegram_chat_id, msg);
        count++;
      }
    }

    return NextResponse.json({ ok: true, sent: count });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
