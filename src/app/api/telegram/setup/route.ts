import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { encrypt } from '@/lib/crypto';

export async function POST(request: Request) {
  try {
    const { token, userId, action } = await request.json();

    if (action === 'disconnect') {
      try {
        const fs = require('fs');
        const path = require('path');
        const fallbackPath = path.join(process.cwd(), 'src/lib/ai_config_fallback.json');
        if (fs.existsSync(fallbackPath)) {
          const parsed = JSON.parse(fs.readFileSync(fallbackPath, 'utf-8'));
          delete parsed.botToken;
          fs.writeFileSync(fallbackPath, JSON.stringify(parsed, null, 2), 'utf-8');
        }
        const globalRef = global as any;
        if (globalRef.activePolls) {
          globalRef.activePolls.clear();
        }
      } catch (e) {
        console.error('Failed to clear token during disconnect:', e);
      }
      
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const isPlaceholder = !supabaseUrl || 
        supabaseUrl.includes('your-supabase-project-id') || 
        supabaseUrl.includes('placeholder-project');

      if (!isPlaceholder) {
        await supabaseAdmin
          .from('profiles')
          .update({ telegram_bot_token: null })
          .eq('id', userId);
      }
      
      return NextResponse.json({ success: true, message: 'Disconnected' });
    }

    if (!token || !userId) {
      return NextResponse.json({ error: 'Token and User ID are required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const isPlaceholder = !supabaseUrl || 
      supabaseUrl.includes('your-supabase-project-id') || 
      supabaseUrl.includes('placeholder-project');

    // 1. Check uniqueness in DB (only if not in local mock mode)
    if (!isPlaceholder) {
      try {
        const { data: allProfiles } = await supabaseAdmin
          .from('profiles')
          .select('id, telegram_bot_token')
          .not('telegram_bot_token', 'is', null);
          
        if (allProfiles) {
          const { decrypt } = await import('@/lib/crypto');
          const isDuplicate = allProfiles.some(p => p.id !== userId && decrypt(p.telegram_bot_token) === token);
          if (isDuplicate) {
            return NextResponse.json({ error: 'Token ini sudah digunakan oleh pengguna lain!' }, { status: 400 });
          }
        }
      } catch (err) {
        console.warn('DB check uniqueness skipped due to connection issue.', err);
      }
    }

    // 2. Test Connection: Call getMe
    const getMeUrl = `https://api.telegram.org/bot${token}/getMe`;
    const getMeResponse = await fetch(getMeUrl);
    
    if (!getMeResponse.ok) {
      const errData = await getMeResponse.json().catch(() => ({ description: 'Token tidak valid' }));
      return NextResponse.json({ 
        error: `Gagal terhubung ke Telegram API: ${errData.description || 'Token salah/invalid'}` 
      }, { status: 400 });
    }

    const getMeData = await getMeResponse.json();
    if (!getMeData.ok) {
      return NextResponse.json({ error: 'Telegram API mengembalikan status error' }, { status: 400 });
    }

    // 3. Detect chat ID of the user who interacted with the bot (Clear webhook temporarily for getUpdates if needed)
    let detectedChatId: number | null = null;
    let detectedName: string | null = null;
    try {
      // Clear webhook temporarily so getUpdates doesn't return 409 Conflict
      await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`);
      
      const getUpdatesUrl = `https://api.telegram.org/bot${token}/getUpdates?limit=10&offset=-10`;
      const updatesRes = await fetch(getUpdatesUrl);
      if (updatesRes.ok) {
        const updatesData = await updatesRes.json();
        if (updatesData.ok && updatesData.result && updatesData.result.length > 0) {
          const lastUpdate = updatesData.result[updatesData.result.length - 1];
          if (lastUpdate.message && lastUpdate.message.chat) {
            detectedChatId = lastUpdate.message.chat.id;
            detectedName = lastUpdate.message.from?.first_name || '';
          } else if (lastUpdate.callback_query && lastUpdate.callback_query.message) {
            detectedChatId = lastUpdate.callback_query.message.chat.id;
            detectedName = lastUpdate.callback_query.from?.first_name || '';
          }
        }
      }
    } catch (e) {
      console.warn('Failed to fetch getUpdates for dynamic pairing:', e);
    }

    // 4. Set Webhook: POST setWebhook with user_id and bot_token query params
    const host = request.headers.get('host') || '';
    const proto = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    const autoBaseUrl = `${proto}://${host}`;

    const webhookBaseUrl = process.env.WEBHOOK_BASE_URL && process.env.WEBHOOK_BASE_URL.startsWith('https://')
      ? process.env.WEBHOOK_BASE_URL
      : (autoBaseUrl.startsWith('https://') ? autoBaseUrl : 'http://localhost:3000');

    const isHttps = webhookBaseUrl.startsWith('https://');
    let webhookRegistered = false;
    let webhookErrorMsg = '';

    if (isHttps) {
      const setWebhookUrl = `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(
        `${webhookBaseUrl}/api/telegram/webhook?user_id=${userId}&bot_token=${encodeURIComponent(token)}`
      )}`;
      
      try {
        const setWebhookResponse = await fetch(setWebhookUrl);
        const setWebhookData = await setWebhookResponse.json();
        if (setWebhookResponse.ok && setWebhookData.ok) {
          webhookRegistered = true;
        } else {
          webhookErrorMsg = setWebhookData.description || 'Ada kesalahan respon setWebhook';
        }
      } catch (err: any) {
        webhookErrorMsg = err.message || 'Error koneksi setWebhook';
      }
    } else {
      webhookErrorMsg = 'Telegram memerlukan URL webhook HTTPS. Di localhost gunakan ngrok atau Vercel live URL.';
    }

    // 5. Save encrypted token and connection status
    const encryptedToken = encrypt(token);
    let updatedProfile: any = null;

    if (!isPlaceholder) {
      try {
        const updateData: any = { telegram_bot_token: encryptedToken };
        if (detectedChatId) {
          updateData.telegram_chat_id = String(detectedChatId);
        }

        const { data: up, error: dbError } = await supabaseAdmin
          .from('profiles')
          .update(updateData)
          .eq('id', userId)
          .select('telegram_chat_id, full_name')
          .maybeSingle();

        if (!dbError && up) {
          updatedProfile = up;
        } else {
          console.warn('Supabase DB profile update skipped/errored, using fallback persistence:', dbError);
          updatedProfile = {
            telegram_chat_id: detectedChatId ? String(detectedChatId) : null,
            full_name: detectedName || (userId === 'usr_admin' ? 'Super Admin' : 'Nasabah')
          };
        }
      } catch (err) {
        console.warn('Supabase DB token save exception, falling back to local persistence:', err);
        updatedProfile = {
          telegram_chat_id: detectedChatId ? String(detectedChatId) : null,
          full_name: detectedName || (userId === 'usr_admin' ? 'Super Admin' : 'Nasabah')
        };
      }
    } else {
      updatedProfile = {
        telegram_chat_id: detectedChatId ? String(detectedChatId) : null,
        full_name: detectedName || (userId === 'usr_admin' ? 'Super Admin' : 'Nasabah')
      };
    }

    // Check fallback for telegram_chat_id if not detected from recent getUpdates
    if (!updatedProfile?.telegram_chat_id) {
      try {
        const fs = require('fs');
        const path = require('path');
        const mockChatsFile = path.join(process.cwd(), 'src/lib/mock_chats.json');
        if (fs.existsSync(mockChatsFile)) {
          const chats = JSON.parse(fs.readFileSync(mockChatsFile, 'utf-8'));
          const foundId = chats[userId] || Object.values(chats)[0];
          if (foundId) {
            updatedProfile = {
              ...updatedProfile,
              telegram_chat_id: String(foundId)
            };
          }
        }
      } catch (e) {}

      if (!updatedProfile?.telegram_chat_id && !isPlaceholder) {
        try {
          const { data: existingProf } = await supabaseAdmin
            .from('profiles')
            .select('telegram_chat_id, full_name')
            .eq('id', userId)
            .maybeSingle();
          if (existingProf?.telegram_chat_id) {
            updatedProfile = {
              ...updatedProfile,
              telegram_chat_id: existingProf.telegram_chat_id,
              full_name: existingProf.full_name || updatedProfile?.full_name
            };
          } else {
            const { data: anyProf } = await supabaseAdmin
              .from('profiles')
              .select('telegram_chat_id, full_name')
              .not('telegram_chat_id', 'is', null)
              .limit(1)
              .maybeSingle();
            if (anyProf?.telegram_chat_id) {
              updatedProfile = {
                ...updatedProfile,
                telegram_chat_id: anyProf.telegram_chat_id,
                full_name: anyProf.full_name || updatedProfile?.full_name
              };
            }
          }
        } catch (e) {}
      }
    }

    // Send a message if telegram_chat_id is set/detected
    let messageSentSuccessfully = false;
    if (updatedProfile?.telegram_chat_id) {
      try {
        const { sendMessage } = await import('@/lib/telegram');
        const keyboardMarkup = {
          keyboard: [
            [ { text: '/saldo' }, { text: '/budget' } ],
            [ { text: '/hari_ini' }, { text: '/sheet' } ],
            [ { text: '/bantuan' } ]
          ],
          resize_keyboard: true,
          one_time_keyboard: false
        };
        const testMsg = `🚀 <b>Selamat Datang di Mencatat Aja Bot!</b> 🚀\n\n` +
          `Halo <b>${updatedProfile.full_name || 'Nasabah'}</b>, koneksi bot kustom Anda telah berhasil diaktifkan! Asisten keuangan AI Anda kini aktif 24/7.\n\n` +
          `📖 <b>Panduan Singkat Penggunaan:</b>\n` +
          `• <code>beli bakso 15rb</code> (Mencatat pengeluaran)\n` +
          `• <code>gaji freelance 2.5jt</code> (Mencatat pemasukan)\n` +
          `• <code>transfer dari BCA ke Gopay 500rb</code> (Mencatat transfer)\n\n` +
          `Ketik /bantuan di chat ini kapan saja untuk melihat panduan lengkap.\n` +
          `Gunakan tombol menu di bawah ini untuk pintasan cepat navigasi Anda! 👇`;
        await sendMessage(token, Number(updatedProfile.telegram_chat_id), testMsg, keyboardMarkup);
        messageSentSuccessfully = true;
      } catch (sendErr) {
        console.error('Failed to send test message:', sendErr);
      }
    }

    // Save to fallback json for auto-start polling on restart
    try {
      const fs = require('fs');
      const path = require('path');
      const fallbackPath = path.join(process.cwd(), 'src/lib/ai_config_fallback.json');
      let fallbackData = {};
      if (fs.existsSync(fallbackPath)) {
        fallbackData = JSON.parse(fs.readFileSync(fallbackPath, 'utf-8'));
      }
      const updatedFallback = {
        ...fallbackData,
        botToken: token
      };
      fs.writeFileSync(fallbackPath, JSON.stringify(updatedFallback, null, 2), 'utf-8');
      console.log('Saved bot token to ai_config_fallback.json for server persistence');
    } catch (writeErr) {
      console.error('Failed to write botToken to ai_config_fallback.json:', writeErr);
    }

    // Start polling automatically if not HTTPS (localhost development)
    if (!isHttps) {
      try {
        const { startPolling } = await import('@/lib/telegram-polling');
        startPolling(token, userId);
      } catch (pollErr) {
        console.error('Failed to start local polling worker:', pollErr);
      }
    }

    let finalWarning = webhookErrorMsg ? `⚠️ Bot terhubung, tetapi webhook tidak terdaftar otomatis: ${webhookErrorMsg}` : null;
    if (!messageSentSuccessfully && !updatedProfile?.telegram_chat_id) {
      finalWarning = `⚠️ Bot terhubung, tetapi Anda belum mengirim pesan ke bot. Kirim pesan apa saja (misalnya: /start) ke bot Telegram Anda terlebih dahulu, kemudian klik "Test Koneksi" lagi agar pesan sambutan otomatis terkirim.`;
    }

    return NextResponse.json({
      success: true,
      botName: getMeData.result.first_name,
      botUsername: getMeData.result.username,
      hasChatId: messageSentSuccessfully || !!updatedProfile?.telegram_chat_id,
      detectedChatId: updatedProfile?.telegram_chat_id || null,
      webhookRegistered,
      webhookWarning: finalWarning
    });
  } catch (err: any) {
    console.error('Telegram setup route error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
