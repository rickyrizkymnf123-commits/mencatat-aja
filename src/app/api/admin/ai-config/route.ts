import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { encrypt } from '@/lib/crypto';
import fs from 'fs';
import path from 'path';

const FALLBACK_PATH = path.join(process.cwd(), 'src/lib/ai_config_fallback.json');

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const baseUrl = body.baseUrl || body.nineRouterBaseUrl;
    const apiKey = body.apiKey !== undefined ? body.apiKey : (body.geminiApiKey || '');
    const defaultModel = body.defaultModel || body.modelName || 'combo';

    if (!baseUrl || !defaultModel) {
      return NextResponse.json({ error: 'Base URL and Default Model are required' }, { status: 400 });
    }

    const configData = {
      baseUrl,
      nineRouterBaseUrl: baseUrl,
      apiKey: apiKey || '',
      geminiApiKey: apiKey || '',
      defaultModel,
      modelName: defaultModel
    };

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const isPlaceholder = !supabaseUrl || 
      supabaseUrl.includes('your-supabase-project-id') || 
      supabaseUrl.includes('placeholder-project');

    if (isPlaceholder) {
      // Save configuration to local fallback file for localhost development
      fs.writeFileSync(FALLBACK_PATH, JSON.stringify(configData, null, 2));
      return NextResponse.json({ success: true, mode: 'local_fallback', ...configData });
    }

    // Encrypt the credentials JSON structure for database
    const encryptedKey = encrypt(JSON.stringify(configData));

    // Upsert the 9router provider row in DB
    const { data: existing } = await supabaseAdmin
      .from('ai_providers')
      .select('id')
      .in('name', ['9router', 'litellm'])
      .maybeSingle();

    if (existing) {
      const { error } = await supabaseAdmin
        .from('ai_providers')
        .update({
          name: '9router',
          api_key: encryptedKey,
          is_active: true
        })
        .eq('id', existing.id);

      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin
        .from('ai_providers')
        .insert({
          name: '9router',
          api_key: encryptedKey,
          is_active: true,
          mode: 'single'
        });

      if (error) throw error;
    }

    // Also sync to local fallback to keep it updated
    try {
      fs.writeFileSync(FALLBACK_PATH, JSON.stringify(configData, null, 2));
    } catch (e) {
      console.warn('Failed to sync fallback file:', e);
    }

    return NextResponse.json({ success: true, ...configData });
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
        const parsed = JSON.parse(raw);
        if (parsed.baseUrl && parsed.baseUrl.includes('koboillm')) {
          parsed.baseUrl = 'http://100.80.46.70:20128/v1';
          parsed.defaultModel = 'combo';
        }
        return NextResponse.json({
          baseUrl: parsed.baseUrl || parsed.nineRouterBaseUrl || 'http://100.80.46.70:20128/v1',
          nineRouterBaseUrl: parsed.nineRouterBaseUrl || parsed.baseUrl || 'http://100.80.46.70:20128/v1',
          apiKey: parsed.apiKey || parsed.geminiApiKey || '',
          geminiApiKey: parsed.geminiApiKey || parsed.apiKey || '',
          defaultModel: parsed.defaultModel || parsed.modelName || 'combo',
          modelName: parsed.modelName || parsed.defaultModel || 'combo'
        });
      }
      return NextResponse.json({
        baseUrl: 'http://100.80.46.70:20128/v1',
        nineRouterBaseUrl: 'http://100.80.46.70:20128/v1',
        apiKey: '',
        geminiApiKey: '',
        defaultModel: 'combo',
        modelName: 'combo'
      });
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
        const parsed = JSON.parse(raw);
        if (parsed.baseUrl && parsed.baseUrl.includes('koboillm')) {
          parsed.baseUrl = 'http://100.80.46.70:20128/v1';
          parsed.defaultModel = 'combo';
        }
        return NextResponse.json({
          baseUrl: parsed.baseUrl || parsed.nineRouterBaseUrl || 'http://100.80.46.70:20128/v1',
          nineRouterBaseUrl: parsed.nineRouterBaseUrl || parsed.baseUrl || 'http://100.80.46.70:20128/v1',
          apiKey: parsed.apiKey || parsed.geminiApiKey || '',
          geminiApiKey: parsed.geminiApiKey || parsed.apiKey || '',
          defaultModel: parsed.defaultModel || parsed.modelName || 'combo',
          modelName: parsed.modelName || parsed.defaultModel || 'combo'
        });
      }
      return NextResponse.json({
        baseUrl: 'http://100.80.46.70:20128/v1',
        nineRouterBaseUrl: 'http://100.80.46.70:20128/v1',
        apiKey: '',
        geminiApiKey: '',
        defaultModel: 'combo',
        modelName: 'combo'
      });
    }

    const { decrypt } = await import('@/lib/crypto');
    const dec = decrypt(existing.api_key);
    if (dec.startsWith('{')) {
      const parsed = JSON.parse(dec);
      let returnBaseUrl = parsed.baseUrl || parsed.nineRouterBaseUrl || 'http://100.80.46.70:20128/v1';
      let returnModel = parsed.defaultModel || parsed.modelName || 'combo';
      if (returnBaseUrl.includes('koboillm')) {
        returnBaseUrl = 'http://100.80.46.70:20128/v1';
        returnModel = 'combo';
      }
      const returnApiKey = parsed.apiKey || parsed.geminiApiKey || '';
      return NextResponse.json({
        baseUrl: returnBaseUrl,
        nineRouterBaseUrl: returnBaseUrl,
        apiKey: returnApiKey,
        geminiApiKey: returnApiKey,
        defaultModel: returnModel,
        modelName: returnModel
      });
    }

    return NextResponse.json({
      baseUrl: 'http://100.80.46.70:20128/v1',
      nineRouterBaseUrl: 'http://100.80.46.70:20128/v1',
      apiKey: dec,
      geminiApiKey: dec,
      defaultModel: 'combo',
      modelName: 'combo'
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
