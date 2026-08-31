import { decrypt } from './crypto';

const globalRef = global as any;
if (!globalRef.activePolls) {
  globalRef.activePolls = new Map<string, boolean>();
}
const activePolls = globalRef.activePolls;

export function stopPolling(token: string) {
  activePolls.set(token, false);
}

export function startPolling(token: string, userId: string) {
  if (activePolls.get(token)) {
    console.log(`Polling already running for bot token: ${token.substring(0, 10)}...`);
    return;
  }
  
  activePolls.set(token, true);
  console.log(`🚀 Starting background polling for bot token: ${token.substring(0, 10)}...`);
  
  // Launch the polling loop in background
  (async () => {
    let offset = 0;
    // Fallback to localhost if no base url is configured
    const webhookBaseUrl = process.env.WEBHOOK_BASE_URL || 'http://localhost:3000';
    
    // Clear any existing webhook so we can poll
    try {
      await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`);
    } catch (e) {
      console.error('Failed to clear webhook before polling:', e);
    }
    
    while (activePolls.get(token)) {
      try {
        const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&timeout=15`);
        if (!response.ok) {
          throw new Error(`Telegram API returned status ${response.status}`);
        }
        
        const data = await response.json();
        if (data.ok && data.result && data.result.length > 0) {
          for (const update of data.result) {
            offset = update.update_id + 1;
            
            // Forward the update to our local webhook endpoint
            try {
              const webhookUrl = `${webhookBaseUrl}/api/telegram/webhook?user_id=${userId}&bot_token=${token}`;
              console.log(`Forwarding update ${update.update_id} to local webhook: ${webhookUrl}`);
              
              await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(update)
              });
            } catch (forwardErr) {
              console.error(`Failed to forward update ${update.update_id}:`, forwardErr);
            }
          }
        }
      } catch (err: any) {
        console.error(`Error in Telegram polling loop:`, err.message || err);
        // Sleep on error to prevent spinning
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      
      // Short sleep to prevent CPU hogging
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`🛑 Polling stopped for bot token: ${token.substring(0, 10)}...`);
  })();
}

export async function initAllPolls() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const isPlaceholder = !supabaseUrl || 
    supabaseUrl.includes('your-supabase-project-id') || 
    supabaseUrl.includes('placeholder-project');
    
  if (isPlaceholder) return;
  
  try {
    const { supabaseAdmin } = await import('./supabase');
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, telegram_bot_token')
      .not('telegram_bot_token', 'is', null);
      
    if (profiles) {
      for (const p of profiles) {
        try {
          const token = decrypt(p.telegram_bot_token);
          if (token) {
            startPolling(token, p.id);
          }
        } catch (decErr) {
          console.error(`Failed to decrypt token for profile ${p.id}:`, decErr);
        }
      }
    }
  } catch (err) {
    console.error('Failed to init all polls:', err);
  }
}

export function autoStartPollingIfConfigured() {
  try {
    const fs = require('fs');
    const path = require('path');
    const fallbackPath = path.join(process.cwd(), 'src/lib/ai_config_fallback.json');
    if (fs.existsSync(fallbackPath)) {
      const parsed = JSON.parse(fs.readFileSync(fallbackPath, 'utf-8'));
      if (parsed && parsed.botToken) {
        startPolling(parsed.botToken, 'usr_budi');
      }
    }
  } catch (e) {}
}
