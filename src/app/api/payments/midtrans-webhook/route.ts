import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendTelegramMessage } from '@/lib/telegram';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { order_id, transaction_status } = body;

    if (!order_id) {
      return NextResponse.json({ error: 'Missing order_id' }, { status: 400 });
    }

    const supabase = createAdminClient();

    let statusUpdate: 'approved' | 'rejected' | 'pending' = 'pending';
    if (transaction_status === 'settlement' || transaction_status === 'capture') {
      statusUpdate = 'approved';
    } else if (transaction_status === 'deny' || transaction_status === 'expire' || transaction_status === 'cancel') {
      statusUpdate = 'rejected';
    }

    if (statusUpdate === 'approved') {
      const { data: payment } = await supabase
        .from('payments')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('order_id', order_id)
        .select()
        .maybeSingle();

      if (payment) {
        // Upgrade user plan to pro
        const { data: profile } = await supabase
          .from('profiles')
          .update({ plan: 'pro' })
          .eq('id', payment.user_id)
          .select()
          .single();

        if (profile && profile.telegram_chat_id) {
          const botToken = profile.telegram_bot_token || process.env.TELEGRAM_BOT_TOKEN || '';
          const msg = `🎉 *Pembayaran Berhasil! Akun Kamu Berhasil Diupgrade ke Paket PRO!*

Halo *${profile.full_name}*, terima kasih atas pembayaran kamu!

Sekarang kamu dapat menikmati seluruh fitur unggulan mencatat.id:
• Transaksi & wallet unlimited
• Scan foto struk (AI Vision OCR)
• Link Google Sheet privat otomatis
• AI Financial Advisor 24/7

Selamat mengendalikan keuanganmu! 💪`;
          await sendTelegramMessage(botToken, profile.telegram_chat_id, msg);
        }
      }
    } else if (statusUpdate === 'rejected') {
      await supabase
        .from('payments')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('order_id', order_id);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
