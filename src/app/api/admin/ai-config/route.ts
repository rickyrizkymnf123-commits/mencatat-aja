import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { encrypt } from '@/lib/crypto';
import fs from 'fs';
import path from 'path';

const FALLBACK_PATH = path.join(process.cwd(), 'src/lib/ai_config_fallback.json');

export async function POST(request: Request) {
  try {
    const { baseUrl, apiKey, defaultModel } = await request.json();

    if (!baseUrl || !defaultModel) {
      return NextResponse.json({ error: 'Base URL and Default Model are required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const isPlaceholder = !supabaseUrl || 
      supabaseUrl.includes('your-supabase-project-id') || 
      supabaseUrl.includes('placeholder-project');

    if (isPlaceholder) {
      // Save configuration to local fallback file for localhost development
      fs.writeFileSync(FALLBACK_PATH, JSON.stringify({ baseUrl, apiKey, defaultModel }, null, 2));
      return NextResponse.json({ success: true, mode: 'local_fallback' });
    }

    // Encrypt the credentials JSON structure for database
    const configPayload = JSON.stringify({
      baseUrl,
      apiKey: apiKey || '',
      defaultModel
    });
    const encryptedKey = encrypt(configPayload);

    // Upsert the litellm provider row
    const { data: existing } = await supabaseAdmin
      .from('ai_providers')
      .select('id')
      .eq('name', 'litellm')
      .maybeSingle();

    if (existing) {
      const { error } = await supabaseAdmin
        .from('ai_providers')
        .update({
          api_key: encryptedKey,
          is_active: true
        })
        .eq('id', existing.id);

      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin
        .from('ai_providers')
        .insert({
          name: 'litellm',
          api_key: encryptedKey,
          is_active: true,
          mode: 'single'
        });

      if (error) throw error;
    }

    // Also sync to local fallback to keep it updated
    try {
      fs.writeFileSync(FALLBACK_PATH, JSON.stringify({ baseUrl, apiKey, defaultModel }, null, 2));
    } catch (e) {
      console.warn('Failed to sync fallback file:', e);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Save AI config route error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const isPlaceholder = !supabaseUrl || 
      supabaseUrl.includes('your-supabase-project-id') || 
      supabaseUrl.includes('placeholder-project');

    if (isPlaceholder) {
      if (fs.existsSync(FALLBACK_PATH)) {
        const raw = fs.readFileSync(FALLBACK_PATH, 'utf-8');
        return NextResponse.json(JSON.parse(raw));
      }
      return NextResponse.json({ baseUrl: 'http://100.80.46.70:20128/v1', apiKey: '', defaultModel: 'combo' });
    }

    const { data: existing } = await supabaseAdmin
      .from('ai_providers')
      .select('*')
      .in('name', ['9router', 'litellm'])
      .maybeSingle();

    if (!existing) {
      // Return local fallback if db record not present yet
      if (fs.existsSync(FALLBACK_PATH)) {
        const raw = fs.readFileSync(FALLBACK_PATH, 'utf-8');
        return NextResponse.json(JSON.parse(raw));
      }
      return NextResponse.json({ baseUrl: 'http://100.80.46.70:20128/v1', apiKey: '', defaultModel: 'combo' });
    }

    const { decrypt } = await import('@/lib/crypto');
    const dec = decrypt(existing.api_key);
    if (dec.startsWith('{')) {
      const parsed = JSON.parse(dec);
      return NextResponse.json({
        baseUrl: parsed.baseUrl || 'http://100.80.46.70:20128/v1',
        apiKey: parsed.apiKey || '',
        defaultModel: parsed.defaultModel || 'combo'
      });
    }

    return NextResponse.json({ baseUrl: 'http://100.80.46.70:20128/v1', apiKey: dec, defaultModel: 'combo' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
