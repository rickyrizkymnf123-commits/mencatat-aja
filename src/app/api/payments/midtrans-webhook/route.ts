import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendMessage } from '@/lib/telegram';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { order_id, transaction_status, payment_type } = body;

    if (!order_id) {
      return NextResponse.json({ error: 'Missing order_id' }, { status: 400 });
    }

    console.log(`Midtrans notification received for order_id: ${order_id}, status: ${transaction_status}`);

    // Resolve order status
    let statusUpdate: 'approved' | 'rejected' | 'pending' = 'pending';
    if (transaction_status === 'settlement' || transaction_status === 'capture') {
      statusUpdate = 'approved';
    } else if (transaction_status === 'deny' || transaction_status === 'expire' || transaction_status === 'cancel') {
      statusUpdate = 'rejected';
    }

    if (statusUpdate === 'approved') {
      // 1. Update Payment Status in DB
      const { data: payment, error: paymentErr } = await supabaseAdmin
        .from('payments')
        .update({
          status: 'approved',
          updated_at: new Date().toISOString()
        })
        .eq('id', order_id)
        .select()
        .maybeSingle();

      if (paymentErr || !payment) {
        console.error('Failed to find or update payment record:', paymentErr);
        return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
      }

      // 2. Upgrade User Plan to Pro
      const { data: profile, error: profileErr } = await supabaseAdmin
        .from('profiles')
        .update({
          plan: 'Pro'
        })
        .eq('id', payment.user_id)
        .select()
        .single();

      if (profileErr || !profile) {
        console.error('Failed to update user profile plan:', profileErr);
        return NextResponse.json({ error: 'Failed to upgrade profile' }, { status: 500 });
      }

      // 3. Send Notification to User on Telegram
      if (profile.telegram_chat_id) {
        const botToken = process.env.TELEGRAM_BOT_TOKEN || '';
        const decryptedBotToken = profile.telegram_bot_token 
          ? (await import('@/lib/crypto')).decrypt(profile.telegram_bot_token) 
          : botToken;

        if (decryptedBotToken) {
          const successMsg = `🎉 <b>Pembayaran Berhasil! Akun Anda Telah Diupgrade Ke PRO!</b>\n\nHalo <b>${profile.full_name || 'Nasabah'}</b>, terima kasih atas pembayaran Anda via <b>${payment_type || 'Midtrans'}</b>.\n\nSekarang Anda telah menikmati semua fitur premium Mencatat Aja:\n• <b>Transaksi Tanpa Batas</b> per bulan\n• <b>OCR Vision</b> untuk membaca foto struk belanja\n• <b>AI Financial Advisor</b> yang aktif 24/7\n• <b>Ekspor Laporan</b> ke Excel & PDF\n• <b>Koneksi Pengingat Kustom</b>\n\nSelamat mengelola keuangan dengan lebih cerdas! 💪`;
          await sendMessage(decryptedBotToken, profile.telegram_chat_id, successMsg);
        }
      }
    } else if (statusUpdate === 'rejected') {
      await supabaseAdmin
        .from('payments')
        .update({
          status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', order_id);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Midtrans webhook route error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
