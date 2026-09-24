function extractJsonHelper(raw: string) {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/, '').trim();
  }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return JSON.parse(cleaned);
}

import { supabaseAdmin } from './supabase';
import { decrypt } from './crypto';

interface AIProviderConfig {
  name: string;
  api_key: string;
  is_active: boolean;
  mode: string;
}

export const DEFAULT_9ROUTER_BASE_URL = process.env.AI_BASE_URL || 'http://100.80.46.70:20128/v1';
export const DEFAULT_9ROUTER_MODEL = process.env.AI_MODEL || 'combo';

// Fetch active AI providers from environment variables, database, or fallback
async function getActiveProviders(): Promise<AIProviderConfig[]> {
  try {
    const envBaseUrl = process.env.AI_BASE_URL || 'http://100.80.46.70:20128/v1';
    const envApiKey = process.env.AI_API_KEY || '';
    const envModel = process.env.AI_MODEL || 'combo';

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const isPlaceholder = !supabaseUrl || 
      supabaseUrl.includes('your-supabase-project-id') || 
      supabaseUrl.includes('placeholder-project');

    // Read local fallback file if exists
    let fallbackConfig: any = null;
    try {
      const fs = require('fs');
      const path = require('path');
      const fallbackPath = path.join(process.cwd(), 'src/lib/ai_config_fallback.json');
      if (fs.existsSync(fallbackPath)) {
        const raw = fs.readFileSync(fallbackPath, 'utf-8');
        fallbackConfig = JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Failed to load local AI configuration fallback:', e);
    }

    if (isPlaceholder) {
      if (fallbackConfig && fallbackConfig.baseUrl) {
        return [{
          name: '9router',
          api_key: fallbackConfig.apiKey || envApiKey,
          is_active: true,
          mode: 'single',
          baseUrl: fallbackConfig.baseUrl || envBaseUrl,
          defaultModel: fallbackConfig.defaultModel || envModel
        } as any];
      }

      return [{
        name: '9router',
        api_key: envApiKey,
        is_active: true,
        mode: 'single',
        baseUrl: envBaseUrl,
        defaultModel: envModel
      } as any];
    }

    const { data, error } = await supabaseAdmin
      .from('ai_providers')
      .select('name, api_key, is_active, mode')
      .eq('is_active', true);
    
    if (error || !data || data.length === 0) {
      if (fallbackConfig && fallbackConfig.baseUrl) {
        return [{
          name: '9router',
          api_key: fallbackConfig.apiKey || envApiKey,
          is_active: true,
          mode: 'single',
          baseUrl: fallbackConfig.baseUrl || envBaseUrl,
          defaultModel: fallbackConfig.defaultModel || envModel
        } as any];
      }

      // Default to 9Router Universal Gateway with auto-switch combo model
      return [{
        name: '9router',
        api_key: envApiKey,
        is_active: true,
        mode: 'single',
        baseUrl: envBaseUrl,
        defaultModel: envModel
      } as any];
    }

    const providers = data.map(p => {
      let dec = decrypt(p.api_key);
      let baseUrl = envBaseUrl;
      let defaultModel = envModel;
      if ((p.name === 'litellm' || p.name === '9router') && dec.startsWith('{')) {
        try {
          const parsed = JSON.parse(dec);
          dec = parsed.apiKey || envApiKey;
          baseUrl = parsed.baseUrl || envBaseUrl;
          defaultModel = parsed.defaultModel || envModel;
        } catch (e) {
          console.error('Failed to parse 9router/litellm json:', e);
        }
      }
      return {
        name: p.name === 'litellm' ? '9router' : p.name,
        api_key: dec,
        is_active: p.is_active,
        mode: p.mode,
        baseUrl,
        defaultModel
      };
    });

    // Ensure 9Router is present as primary provider
    const hasGateway = providers.some(p => p.name === '9router' || (p as any).baseUrl);
    if (!hasGateway) {
      providers.unshift({
        name: '9router',
        api_key: envApiKey,
        is_active: true,
        mode: 'single',
        baseUrl: envBaseUrl,
        defaultModel: envModel
      } as any);
    }

    return providers;
  } catch (err) {
    console.error('Error fetching AI providers:', err);
    return [{
      name: '9router',
      api_key: process.env.AI_API_KEY || '',
      is_active: true,
      mode: 'single',
      baseUrl: process.env.AI_BASE_URL || 'http://100.80.46.70:20128/v1',
      defaultModel: process.env.AI_MODEL || 'combo'
    } as any];
  }
}

// Log AI usage
async function logAIUsage(userId: string | null, provider: string, action: string, promptTokens: number, completionTokens: number, status: string) {
  try {
    // Estimasi biaya (rough cost estimation per 1k tokens)
    let cost = 0;
    if (provider === 'gemini') {
      cost = (promptTokens * 0.000075 + completionTokens * 0.0003) / 1000;
    } else if (provider === 'openai') {
      cost = (promptTokens * 0.0015 + completionTokens * 0.002) / 1000;
    } else if (provider === 'deepseek') {
      cost = (promptTokens * 0.00014 + completionTokens * 0.00028) / 1000;
    }

    await supabaseAdmin.from('ai_logs').insert({
      user_id: userId,
      provider,
      action,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      cost,
      status
    });
  } catch (err) {
    console.error('Failed to log AI usage:', err);
  }
}

export interface GenerateAiCompletionOptions {
  prompt?: string;
  messages?: Array<{ role: string; content: any }>;
  baseUrl?: string;
  nineRouterBaseUrl?: string;
  apiKey?: string;
  geminiApiKey?: string;
  model?: string;
  modelName?: string;
  temperature?: number;
  max_tokens?: number;
  response_format?: any;
}

/**
 * Universal 9Router AI Gateway Completion (OpenAI-compatible)
 * Zero-Bug Rule Implementation:
 * 1. Target Base URL & Endpoint: http://localhost:20128/v1 or http://100.80.46.70:20128/v1 -> /chat/completions
 * 2. Request Payload: POST with Authorization: Bearer <API_KEY>, x-api-key: <API_KEY>, stream: false
 * 3. Dual Response Parser: Try JSON.parse first, fallback to line-by-line SSE data: chunk parsing
 * 4. Strict No-Fallback for Model Aliases: Never fallback model aliases (containing '/', 'bebas', etc.) to Google SDK
 */
export async function generateAiCompletion(
  options: GenerateAiCompletionOptions | string
): Promise<{ text: string; usage: { prompt_tokens: number; completion_tokens: number } }> {
  let promptStr = typeof options === 'string' ? options : options.prompt || '';
  let messages = typeof options === 'object' && options.messages 
    ? options.messages 
    : [{ role: 'user', content: promptStr }];
  
  let baseUrl = (typeof options === 'object' && (options.baseUrl || options.nineRouterBaseUrl)) || process.env.AI_BASE_URL || 'http://localhost:20128/v1';
  let apiKey = (typeof options === 'object' && (options.apiKey || options.geminiApiKey)) || process.env.AI_API_KEY || '';
  let model = (typeof options === 'object' && (options.model || options.modelName)) || process.env.AI_MODEL || 'combo';
  let temperature = typeof options === 'object' && options.temperature !== undefined ? options.temperature : 0.1;

  // Resolve config from active providers or local fallback if not explicitly provided
  if (!apiKey || !baseUrl) {
    try {
      const providers = await getActiveProviders();
      const primary = providers.find(p => p.name === '9router' || (p as any).baseUrl) || providers[0];
      if (primary) {
        if (!apiKey) apiKey = primary.api_key || '';
        if (!baseUrl) baseUrl = (primary as any).baseUrl || baseUrl;
        if (!model || model === 'combo') model = (primary as any).defaultModel || model;
      }
    } catch (e) {
      console.warn('Failed to resolve primary 9router provider config:', e);
    }
  }

  // 1. Resolve Target Base URL & Endpoint
  const cleanBase = baseUrl.trim().replace(/\/+$/, '');
  let endpoint = cleanBase;
  if (cleanBase.endsWith('/chat/completions')) {
    endpoint = cleanBase;
  } else if (cleanBase.endsWith('/v1')) {
    endpoint = `${cleanBase}/chat/completions`;
  } else {
    endpoint = `${cleanBase}/v1/chat/completions`;
  }

  // 2. Request Headers & Payload
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
    headers['x-api-key'] = apiKey;
  }

  const payload: any = {
    model: model || 'combo',
    messages,
    stream: false,
    temperature
  };

  if (typeof options === 'object' && options.response_format) {
    payload.response_format = options.response_format;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`9Router Gateway Error (${response.status}): ${errText || response.statusText}`);
  }

  const rawText = await response.text();
  let text = '';
  let usage = { prompt_tokens: 0, completion_tokens: 0 };

  // 3. DUAL RESPONSE PARSER (PARSER GANDA)
  try {
    // Step 1: Standard JSON parse
    const data = JSON.parse(rawText);
    text = data.choices?.[0]?.message?.content ?? data.choices?.[0]?.delta?.content ?? (typeof data.content === 'string' ? data.content : '');
    if (data.usage) {
      usage = data.usage;
    }
  } catch (parseErr) {
    // Step 2: Fallback SSE line-by-line stream chunk parser
    const lines = rawText.split('\n');
    let accumulatedContent = '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('data:') && !trimmed.includes('[DONE]')) {
        try {
          const jsonStr = trimmed.replace(/^data:\s*/, '');
          const parsedChunk = JSON.parse(jsonStr);
          const chunkText = parsedChunk.choices?.[0]?.delta?.content ?? parsedChunk.choices?.[0]?.message?.content ?? '';
          accumulatedContent += chunkText;
          if (parsedChunk.usage) {
            usage = parsedChunk.usage;
          }
        } catch (err) {
          // ignore invalid chunk
        }
      }
    }
    text = accumulatedContent || rawText;
  }

  return { text, usage };
}

// 1. TEXT PARSING PIPELINE
export async function parseTransactionText(
  text: string,
  categoriesList: Array<{ name: string; emoji: string }>,
  walletsList: string[],
  userId: string | null = null
): Promise<{
  type: 'expense' | 'income' | 'transfer';
  amount: number;
  category: string | null;
  description: string;
  transfer_to_wallet?: string | null;
}> {
  const prompt = `
  Anda adalah AI finansial yang bertugas mengekstrak detail transaksi dari teks bahasa natural bahasa Indonesia.
  
  Kategori yang tersedia: ${categoriesList.map(c => `${c.emoji} ${c.name}`).join(', ')}
  Dompet yang tersedia: ${walletsList.join(', ')}
  
  Teks transaksi: "${text}"
  
  Format nominal Indonesia yang harus dipahami:
  - "15rb" / "15ribu" / "15 k" = 15000
  - "1.5jt" / "1,5jt" = 1500000
  - "500k" = 500000
  - "setengah juta" = 500000
  - "1 juta" = 1000000
  - "dua ratus lima puluh ribu" = 250000
  - dst.
  
  Kembalikan JSON dengan format persis berikut (tanpa tambahan teks lain):
  {
    "type": "expense" | "income" | "transfer",
    "amount": number (integer nominal transaksi),
    "category": "nama kategori yang paling sesuai dari daftar di atas" (jika transfer atau kategori tidak ditemukan, isi null),
    "description": "keterangan/catatan singkat transaksi (misal: Beli Bakso)",
    "transfer_to_wallet": "nama dompet tujuan jika tipe transaksi adalah transfer, selain itu null"
  }
  `;

  let providers: any[] = [];
  try {
    providers = await getActiveProviders();
  } catch (e) {
    console.warn('Failed to load active providers for parsing:', e);
  }

  for (const provider of providers) {
    try {
      const model = (provider as any).defaultModel || DEFAULT_9ROUTER_MODEL;
      const is9Router = provider.name === '9router' || provider.name === 'litellm' || !!(provider as any).baseUrl;
      const isCustomAlias = model.includes('/') || model === 'combo' || model === 'bebas' || model.startsWith('cc/') || model.startsWith('cx/') || model.startsWith('gh/') || model.startsWith('cu/') || model.startsWith('glm/') || model.startsWith('minimax/') || model.startsWith('kimi/') || model.startsWith('kr/') || model.startsWith('vertex/');

      // Rule 4: STRICT NO-FALLBACK FOR MODEL ALIASES - route directly through 9Router gateway
      if (is9Router || isCustomAlias) {
        const result = await generateAiCompletion({
          baseUrl: (provider as any).baseUrl || DEFAULT_9ROUTER_BASE_URL,
          apiKey: provider.api_key,
          model,
          prompt
        });
        await logAIUsage(userId, '9router', 'parsing_text', result.usage.prompt_tokens, result.usage.completion_tokens, 'success');
        let cleanText = result.text.trim();
        if (cleanText.startsWith('```')) {
          cleanText = cleanText.replace(/^```json\s*/, '').replace(/```$/, '').trim();
        }
        return extractJsonHelper(cleanText);
      } else if (provider.name === 'openai') {
        const result = await callOpenAIAPI(provider.api_key, prompt, 'text');
        await logAIUsage(userId, 'openai', 'parsing_text', result.usage.prompt_tokens, result.usage.completion_tokens, 'success');
        return extractJsonHelper(result.text);
      } else if (provider.name === 'deepseek') {
        const result = await callDeepSeekAPI(provider.api_key, prompt, 'text');
        await logAIUsage(userId, 'deepseek', 'parsing_text', result.usage.prompt_tokens, result.usage.completion_tokens, 'success');
        return extractJsonHelper(result.text);
      } else if (provider.name === 'gemini') {
        const result = await callGeminiAPI(provider.api_key, prompt, 'text');
        await logAIUsage(userId, 'gemini', 'parsing_text', result.usage.prompt_tokens, result.usage.completion_tokens, 'success');
        return extractJsonHelper(result.text);
      }
    } catch (err) {
      console.error(`AI Provider ${provider.name} failed during text parsing, trying next...`, err);
      await logAIUsage(userId, provider.name, 'parsing_text', 0, 0, 'failed');
    }
  }

  // Fallback to fast local rule-based parser if no providers or if they all failed
  console.log('Local Text Parser Fallback:', text);
  const lower = text.toLowerCase();
  
  let type: 'expense' | 'income' | 'transfer' = 'expense';
  let amount = 15000;
  let category: string | null = 'Makanan';
  let description = text;
  let transfer_to_wallet: string | null = null;
  
  const amountMatch = lower.match(/(\d+(?:[\.,]\d+)?)\s*(jt|juta|rb|ribu|k|ratus ribu)?/);
  if (amountMatch) {
    let val = parseFloat(amountMatch[1].replace(',', '.'));
    const unit = amountMatch[2];
    if (unit === 'jt' || unit === 'juta') {
      val *= 1000000;
    } else if (unit === 'rb' || unit === 'ribu' || unit === 'k') {
      val *= 1000;
    } else if (unit === 'ratus ribu') {
      val *= 100000;
    }
    amount = Math.round(val);
  }
  
  if (lower.includes('gaji') || lower.includes('pemasukan') || lower.includes('income') || lower.includes('transfer masuk') || lower.includes('dapat uang') || lower.includes('freelance') || lower.includes('bonus')) {
    type = 'income';
    category = 'Gaji';
    description = text;
  } else if (lower.includes('transfer') || lower.includes('kirim')) {
    type = 'transfer';
    category = null;
    description = text;
    const target = walletsList.find(w => lower.includes(w.toLowerCase()) && lower.indexOf(w.toLowerCase()) > lower.indexOf('ke'));
    transfer_to_wallet = target || walletsList[1] || 'Cash';
  } else {
    type = 'expense';
    if (lower.includes('bakso') || lower.includes('makan') || lower.includes('kopi') || lower.includes('susu') || lower.includes('teh') || lower.includes('warung') || lower.includes('nasgor')) {
      category = 'Makanan';
    } else if (lower.includes('bensin') || lower.includes('transport') || lower.includes('ojek') || lower.includes('gojek') || lower.includes('grab')) {
      category = 'Transport';
    } else if (lower.includes('anggaran') || lower.includes('nonton') || lower.includes('game') || lower.includes('hiburan')) {
      category = 'Hiburan';
    } else if (lower.includes('belanja') || lower.includes('baju') || lower.includes('sepatu')) {
      category = 'Belanja';
    } else {
      category = 'Lainnya';
    }
    description = text;
  }
  
  return {
    type,
    amount,
    category,
    description,
    transfer_to_wallet
  };
}

// 2. AUDIO TRANSCRIBE PIPELINE
export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType: string,
  userId: string | null = null
): Promise<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const isPlaceholder = !supabaseUrl || 
    supabaseUrl.includes('your-supabase-project-id') || 
    supabaseUrl.includes('placeholder-project');

  const providers = await getActiveProviders();
  if (providers.length === 0) {
    throw new Error('No active AI provider configured.');
  }

  for (const provider of providers) {
    try {
      if (provider.name === 'gemini') {
        const result = await callGeminiAudioAPI(provider.api_key, audioBuffer, mimeType);
        await logAIUsage(userId, 'gemini', 'transcribe_audio', result.usage.prompt_tokens, result.usage.completion_tokens, 'success');
        return result.text.trim();
      } else if (provider.name === 'openai') {
        const text = await callOpenAIWhisperAPI(provider.api_key, audioBuffer, mimeType);
        await logAIUsage(userId, 'openai', 'transcribe_audio', 0, 0, 'success');
        return text;
      } else if (provider.name === 'litellm' || provider.name === '9router') {
        // Correctly route proxy audio transcription requests through the proxy API completions instead of direct Google endpoints
        const text = await callProxyAudioTranscription((provider as any).baseUrl || DEFAULT_9ROUTER_BASE_URL, provider.api_key, (provider as any).defaultModel || DEFAULT_9ROUTER_MODEL, audioBuffer, mimeType);
        await logAIUsage(userId, provider.name, 'transcribe_audio', 0, 0, 'success');
        return text;
      }
    } catch (err) {
      console.error(`AI Provider ${provider.name} failed during audio transcription, trying next...`, err);
      await logAIUsage(userId, provider.name, 'transcribe_audio', 0, 0, 'failed');
    }
  }

  if (isPlaceholder) {
    console.log('Fallback to mock transcription because active provider transcription failed');
    return 'pemasukan dari gaji BCA 2 juta';
  }

  throw new Error('All AI providers failed to transcribe the audio.');
}

// 3. RECEIPT OCR PIPELINE (PRO feature)
export async function parseReceiptImage(
  imageBuffer: Buffer,
  mimeType: string,
  categoriesList: Array<{ name: string; emoji: string }>,
  userId: string | null = null
): Promise<{
  merchant: string;
  date: string; // YYYY-MM-DD
  total: number;
  items: Array<{
    name: string;
    price: number;
    quantity: number;
    category: string;
  }>;
}> {
  const providers = await getActiveProviders();
  if (providers.length === 0) {
    throw new Error('No active AI provider configured.');
  }

  const prompt = `
  Anda adalah AI Vision yang bertugas melakukan OCR pada foto struk belanja, nota pembelian (termasuk nota bertuliskan tangan), kuitansi, atau faktur belanja di Indonesia.
  Ekstrak informasi merchant, tanggal, total, dan rincian barang belanjaan.
  
  Pilihan kategori yang harus diisi untuk tiap barang belanjaan: ${categoriesList.map(c => c.name).join(', ')}
  
  Kembalikan JSON dengan format persis berikut (tanpa tambahan teks lain):
  {
    "merchant": "Nama Toko/Merchant (misal: Indomaret)",
    "date": "Tanggal transaksi dalam format YYYY-MM-DD (jika tidak ketemu gunakan tanggal hari ini)",
    "total": number (total bayar akhir),
    "items": [
      {
        "name": "Nama item barang",
        "price": number (harga per unit barang),
        "quantity": number (jumlah barang),
        "category": "kategori yang paling cocok untuk barang ini dari daftar di atas"
      }
    ]
  }
  `;

  for (const provider of providers) {
    try {
      if (provider.name === 'gemini') {
        const result = await callGeminiVisionAPI(provider.api_key, imageBuffer, mimeType, prompt);
        await logAIUsage(userId, 'gemini', 'ocr_receipt', result.usage.prompt_tokens, result.usage.completion_tokens, 'success');
        return extractJsonHelper(result.text);
      } else if (provider.name === 'openai') {
        const result = await callOpenAIVisionAPI(provider.api_key, imageBuffer, mimeType, prompt);
        await logAIUsage(userId, 'openai', 'ocr_receipt', result.usage.prompt_tokens, result.usage.completion_tokens, 'success');
        return extractJsonHelper(result.text);
      } else if (provider.name === 'litellm' || provider.name === '9router') {
        const result = await callCustomVisionAPI((provider as any).baseUrl || DEFAULT_9ROUTER_BASE_URL, provider.api_key, (provider as any).defaultModel || DEFAULT_9ROUTER_MODEL, prompt, imageBuffer, mimeType);
        await logAIUsage(userId, provider.name, 'ocr_receipt', result.usage.prompt_tokens, result.usage.completion_tokens, 'success');
        let cleanText = result.text.trim();
        if (cleanText.startsWith('```')) {
          cleanText = cleanText.replace(/^```json\s*/, '').replace(/```$/, '').trim();
        }
        return extractJsonHelper(cleanText);
      }
    } catch (err) {
      console.error(`AI Provider ${provider.name} failed during OCR, trying next...`, err);
      await logAIUsage(userId, provider.name, 'ocr_receipt', 0, 0, 'failed');
    }
  }

  throw new Error('All Vision AI providers failed to process the receipt.');
}

// 4. FINANCIAL ADVISOR GENERATOR
export async function generateFinancialAdvice(
  userName: string,
  userTransactions: any[],
  categoryBudgets: any[],
  triggerReason: string,
  userId: string | null = null
): Promise<string> {
  const prompt = `
  Anda adalah "Financial Advisor" personal yang ramah, sopan, dan ahli keuangan dalam bahasa Indonesia.
  Berdasarkan data keuangan berikut, berikan saran spesifik, taktis, dan mudah dilakukan (actionable).
  
  Nama User: ${userName}
  Alasan Trigger: ${triggerReason}
  Data Budget Bulanan: ${JSON.stringify(categoryBudgets)}
  15 Transaksi Terakhir: ${JSON.stringify(userTransactions)}
  
  Berikan respons terstruktur dalam format:
  🤖 Financial Advisor
  Hei [nama]! [analisa personal singkat 2-3 kalimat mengenai pola pengeluaran atau alasan terpicunya alarm ini]
  💡 Saran: [saran spesifik yang bisa dilakukan secara langsung]
  `;

  let providers: any[] = [];
  try {
    providers = await getActiveProviders();
  } catch (e) {
    console.warn('Failed to load active providers for advice:', e);
  }

  for (const provider of providers) {
    try {
      const model = (provider as any).defaultModel || DEFAULT_9ROUTER_MODEL;
      const is9Router = provider.name === '9router' || provider.name === 'litellm' || !!(provider as any).baseUrl;
      const isCustomAlias = model.includes('/') || model === 'combo' || model === 'bebas' || model.startsWith('cc/') || model.startsWith('cx/') || model.startsWith('gh/') || model.startsWith('cu/') || model.startsWith('glm/') || model.startsWith('minimax/') || model.startsWith('kimi/') || model.startsWith('kr/') || model.startsWith('vertex/');

      if (is9Router || isCustomAlias) {
        const result = await generateAiCompletion({
          baseUrl: (provider as any).baseUrl || DEFAULT_9ROUTER_BASE_URL,
          apiKey: provider.api_key,
          model,
          prompt
        });
        await logAIUsage(userId, '9router', 'advisor', result.usage.prompt_tokens, result.usage.completion_tokens, 'success');
        return result.text;
      } else if (provider.name === 'openai') {
        const result = await callOpenAIAPI(provider.api_key, prompt, 'advisor');
        await logAIUsage(userId, 'openai', 'advisor', result.usage.prompt_tokens, result.usage.completion_tokens, 'success');
        return result.text;
      } else if (provider.name === 'deepseek') {
        const result = await callDeepSeekAPI(provider.api_key, prompt, 'advisor');
        await logAIUsage(userId, 'deepseek', 'advisor', result.usage.prompt_tokens, result.usage.completion_tokens, 'success');
        return result.text;
      } else if (provider.name === 'gemini') {
        const result = await callGeminiAPI(provider.api_key, prompt, 'advisor');
        await logAIUsage(userId, 'gemini', 'advisor', result.usage.prompt_tokens, result.usage.completion_tokens, 'success');
        return result.text;
      }
    } catch (err) {
      console.error(`AI Provider ${provider.name} failed during financial advisor generation, trying next...`, err);
    }
  }

  return 'Maaf, asisten keuangan kami sedang sibuk. Tetap hemat ya!';
}

// ==========================================
// LOW-LEVEL CALL IMPLEMENTATIONS (via FETCH)
// ==========================================

async function callGeminiAPI(apiKey: string, prompt: string, actionType: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: actionType === 'text' ? { responseMimeType: 'application/json' } : {}
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  // Extract json block if model returned markdown block
  let cleanedText = rawText.trim();
  if (actionType === 'text' && cleanedText.startsWith('```')) {
    cleanedText = cleanedText.replace(/^```json\n/, '').replace(/\n```$/, '');
  }

  return {
    text: cleanedText,
    usage: {
      prompt_tokens: data.usageMetadata?.promptTokenCount || 0,
      completion_tokens: data.usageMetadata?.candidatesTokenCount || 0
    }
  };
}

async function callOpenAIAPI(apiKey: string, prompt: string, actionType: string) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: actionType === 'text' ? { type: 'json_object' } : undefined
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    text: data.choices?.[0]?.message?.content || '',
    usage: {
      prompt_tokens: data.usage?.prompt_tokens || 0,
      completion_tokens: data.usage?.completion_tokens || 0
    }
  };
}

async function callDeepSeekAPI(apiKey: string, prompt: string, actionType: string) {
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      response_format: actionType === 'text' ? { type: 'json_object' } : undefined
    })
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    text: data.choices?.[0]?.message?.content || '',
    usage: {
      prompt_tokens: data.usage?.prompt_tokens || 0,
      completion_tokens: data.usage?.completion_tokens || 0
    }
  };
}

async function callGeminiAudioAPI(apiKey: string, audioBuffer: Buffer, mimeType: string) {
  const cleanMimeType = mimeType.split(';')[0].trim();
  const base64Audio = audioBuffer.toString('base64');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { inlineData: { mimeType: cleanMimeType, data: base64Audio } },
          { text: "Transkrip audio ini ke teks bahasa Indonesia secara lengkap dan tepat tanpa ringkasan atau penjelasan." }
        ]
      }]
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini Audio API error: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    text: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
    usage: {
      prompt_tokens: data.usageMetadata?.promptTokenCount || 0,
      completion_tokens: data.usageMetadata?.candidatesTokenCount || 0
    }
  };
}

async function callOpenAIWhisperAPI(
  apiKey: string,
  audioBuffer: Buffer,
  mimeType: string,
  baseUrl: string = 'https://api.openai.com/v1'
): Promise<string> {
  const formData = new FormData();
  let extension = 'ogg';
  if (mimeType.includes('mp3')) extension = 'mp3';
  else if (mimeType.includes('wav')) extension = 'wav';
  else if (mimeType.includes('m4a')) extension = 'm4a';

  const blob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
  formData.append('file', blob, `audio.${extension}`);
  formData.append('model', 'whisper-1');
  formData.append('language', 'id');

  const endpoint = baseUrl.endsWith('/') ? `${baseUrl}audio/transcriptions` : `${baseUrl}/audio/transcriptions`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error(`OpenAI Whisper error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.text || '';
}

async function callProxyAudioTranscription(
  baseUrl: string,
  apiKey: string,
  model: string,
  audioBuffer: Buffer,
  mimeType: string
): Promise<string> {
  const cleanMimeType = mimeType.split(';')[0].trim();
  const base64Audio = audioBuffer.toString('base64');
  
  // Try 1: OpenAI-compatible input_audio format inside chat completions (multimodal)
  try {
    const cleanBase = baseUrl.trim().replace(/\/+$/, '');
    const url = cleanBase.endsWith('/chat/completions') 
      ? cleanBase 
      : cleanBase.endsWith('/v1') 
        ? `${cleanBase}/chat/completions` 
        : `${cleanBase}/v1/chat/completions`;

    let audioFormat = 'ogg';
    if (cleanMimeType.includes('mp3')) audioFormat = 'mp3';
    else if (cleanMimeType.includes('wav')) audioFormat = 'wav';
    else if (cleanMimeType.includes('m4a')) audioFormat = 'm4a';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
      headers['x-api-key'] = apiKey;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: model || 'combo',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Transkrip suara ini ke teks bahasa Indonesia secara lengkap dan tepat tanpa ringkasan atau penjelasan.' },
              {
                type: 'input_audio',
                input_audio: {
                  data: base64Audio,
                  format: audioFormat
                }
              }
            ]
          }
        ],
        stream: false,
        temperature: 0.1
      }),
      signal: AbortSignal.timeout(3000)
    });

    if (response.ok) {
      const rawText = await response.text();
      let text = '';
      try {
        const data = JSON.parse(rawText);
        text = data.choices?.[0]?.message?.content ?? data.choices?.[0]?.delta?.content ?? '';
      } catch (e) {
        const lines = rawText.split('\n');
        for (const line of lines) {
          if (line.trim().startsWith('data:') && !line.includes('[DONE]')) {
            try {
              const chunk = JSON.parse(line.trim().replace(/^data:\s*/, ''));
              text += chunk.choices?.[0]?.delta?.content ?? chunk.choices?.[0]?.message?.content ?? '';
            } catch (err) {}
          }
        }
      }
      if (text.trim().length > 0) return text.trim();
    }
  } catch (e) {
    console.warn('Proxy chat completions audio transcribe failed, trying Whisper endpoint...', e);
  }

  // Try 2: Whisper-compatible transcribe endpoint
  try {
    const cleanBase = baseUrl.trim().replace(/\/+$/, '');
    const endpoint = cleanBase.endsWith('/v1') ? `${cleanBase}/audio/transcriptions` : `${cleanBase}/v1/audio/transcriptions`;
    const formData = new FormData();
    let extension = 'ogg';
    if (cleanMimeType.includes('mp3')) extension = 'mp3';
    else if (cleanMimeType.includes('wav')) extension = 'wav';
    
    const blob = new Blob([new Uint8Array(audioBuffer)], { type: cleanMimeType });
    formData.append('file', blob, `audio.${extension}`);
    formData.append('model', 'whisper-1');
    formData.append('language', 'id');

    const headers: Record<string, string> = {};
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
      headers['x-api-key'] = apiKey;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: formData,
      signal: AbortSignal.timeout(3000)
    });

    if (response.ok) {
      const data = await response.json();
      if (data.text) return data.text.trim();
    }
  } catch (e) {
    console.warn('Proxy Whisper endpoint transcribe failed:', e);
  }

  throw new Error('Proxy failed to transcribe audio using both chat completions and Whisper endpoints.');
}

async function callGeminiVisionAPI(apiKey: string, imageBuffer: Buffer, mimeType: string, prompt: string) {
  const base64Image = imageBuffer.toString('base64');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { inlineData: { mimeType, data: base64Image } },
          { text: prompt }
        ]
      }],
      generationConfig: { responseMimeType: 'application/json' }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini Vision API error: ${response.statusText}`);
  }

  const data = await response.json();
  let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  let cleanedText = rawText.trim();
  if (cleanedText.startsWith('```')) {
    cleanedText = cleanedText.replace(/^```json\n/, '').replace(/\n```$/, '');
  }

  return {
    text: cleanedText,
    usage: {
      prompt_tokens: data.usageMetadata?.promptTokenCount || 0,
      completion_tokens: data.usageMetadata?.candidatesTokenCount || 0
    }
  };
}

async function callOpenAIVisionAPI(apiKey: string, imageBuffer: Buffer, mimeType: string, prompt: string) {
  const base64Image = imageBuffer.toString('base64');
  const imageUrl = `data:${mimeType};base64,${base64Image}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageUrl } }
          ]
        }
      ],
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI Vision API error: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    text: data.choices?.[0]?.message?.content || '',
    usage: {
      prompt_tokens: data.usage?.prompt_tokens || 0,
      completion_tokens: data.usage?.completion_tokens || 0
    }
  };
}

/**
 * Universal 9Router Gateway LLM Caller (OpenAI-compatible)
 */
export async function callCustomLLMAPI(
  baseUrl: string,
  apiKey: string,
  model: string,
  prompt: string
): Promise<{ text: string; usage: { prompt_tokens: number; completion_tokens: number } }> {
  return generateAiCompletion({
    baseUrl,
    apiKey,
    model,
    prompt
  });
}

async function callCustomVisionAPI(
  baseUrl: string,
  apiKey: string,
  model: string,
  prompt: string,
  imageBuffer: Buffer,
  mimeType: string
): Promise<{ text: string; usage: { prompt_tokens: number; completion_tokens: number } }> {
  const base64Image = imageBuffer.toString('base64');
  return generateAiCompletion({
    baseUrl,
    apiKey,
    model,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`
            }
          }
        ]
      }
    ]
  });
}
