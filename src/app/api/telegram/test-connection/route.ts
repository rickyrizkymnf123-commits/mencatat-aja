import { NextRequest, NextResponse } from 'next/server';
import { testTelegramToken, setTelegramWebhook } from '@/lib/telegram';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, description: 'Unauthorized' }, { status: 401 });
    }

    const { botToken, chatId } = await req.json();

    if (!botToken || typeof botToken !== 'string') {
      return NextResponse.json({ ok: false, description: 'Token bot tidak boleh kosong' }, { status: 400 });
    }

    const cleanToken = botToken.trim();

    // 1. Check uniqueness: Prevent 1 token from being used by another user
    const { data: existingTokenUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('telegram_bot_token', cleanToken)
      .neq('id', user.id)
      .maybeSingle();

    if (existingTokenUser) {
      return NextResponse.json({
        ok: false,
        description: 'Token bot ini sudah digunakan oleh akun lain. Silakan buat bot baru via @BotFather.',
      });
    }

    // 2. Test token with Telegram API getMe
    const testResult = await testTelegramToken(cleanToken);

    if (!testResult.ok) {
      // Update database status to disconnected
      await supabase
        .from('profiles')
        .update({
          telegram_connection_status: 'disconnected',
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      return NextResponse.json({
        ok: false,
        description: testResult.description || 'Token bot Telegram tidak valid. Periksa kembali token dari @BotFather.',
      });
    }

    // 3. Set Webhook automatically
    const baseUrl = process.env.WEBHOOK_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://mencatat.id';
    const webhookResult = await setTelegramWebhook(cleanToken, baseUrl);

    if (!webhookResult.ok) {
      console.warn('Webhook set warning:', webhookResult.description);
    }

    // 4. Update Profile in Supabase
    const updatePayload: any = {
      telegram_bot_token: cleanToken,
      telegram_connection_status: 'connected',
      telegram_username: testResult.botInfo?.username || null,
      updated_at: new Date().toISOString(),
    };

    if (chatId) {
      updatePayload.telegram_chat_id = parseInt(chatId, 10);
    }

    await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', user.id);

    return NextResponse.json({
      ok: true,
      description: 'Token valid dan webhook Telegram berhasil terhubung!',
      botInfo: testResult.botInfo,
    });
  } catch (err: any) {
    console.error('Test Telegram Connection error:', err);
    return NextResponse.json({ ok: false, description: err.message || 'Terjadi kesalahan sistem' }, { status: 500 });
  }
}
