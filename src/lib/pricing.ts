import fs from 'fs';
import path from 'path';
import { supabaseAdmin, supabaseUrl } from './supabase';

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  period: string;
  description: string;
  badge?: string;
  features: string[];
  limitations?: string[];
  isPopular?: boolean;
}

export interface PricingConfig {
  basic: PricingPlan;
  pro: PricingPlan;
  updatedAt?: string;
}

export const DEFAULT_PRICING: PricingConfig = {
  basic: {
    id: 'basic',
    name: 'Basic',
    price: 0,
    period: 'Gratis',
    description: 'Pencatatan keuangan personal dasar & dompet standar.',
    features: [
      'Pencatatan transaksi manual & AI teks',
      'Manajemen multi-dompet & kategori',
      'Laporan ringkasan bulanan & grafik',
      'Akses Web Dashboard 24/7'
    ],
    limitations: [
      'Tanpa Scan Struk Belanja (OCR Vision)',
      'Tanpa Integrasi Bot Telegram Pribadi',
      'Ekspor PDF & Excel dinonaktifkan'
    ]
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 49000,
    period: 'Bulan',
    description: 'Akses tanpa batas ke seluruh ekosistem AI & bot otomatisasi.',
    badge: 'PALING POPULER',
    isPopular: true,
    features: [
      '📸 Scan Struk Belanja Instan (AI Vision OCR)',
      '🤖 Integrasi Bot Telegram Pribadi (BYOB Bot Token)',
      '⚡ AI Financial Advisor 24/7 Realtime',
      '📊 Ekspor Laporan Lengkap ke Excel & PDF',
      '👛 Multi-dompet & Kategori Kustom Tanpa Batas',
      '🚀 Transaksi & Kuota AI Tanpa Batas'
    ]
  }
};

const FALLBACK_FILE = path.join(process.cwd(), 'src/lib/pricing_config_fallback.json');

// In-memory cache for ultra-fast response
let cachedPricing: PricingConfig | null = null;

export async function getPricingConfig(): Promise<PricingConfig> {
  if (cachedPricing) {
    return cachedPricing;
  }

  try {
    const isPlaceholder = !supabaseUrl || 
      supabaseUrl.includes('your-supabase-project-id') || 
      supabaseUrl.includes('placeholder-project');

    if (!isPlaceholder) {
      // Primary: query ai_providers table (guaranteed to exist in DB schema)
      const { data: providerRow, error: providerErr } = await supabaseAdmin
        .from('ai_providers')
        .select('api_key')
        .eq('name', 'pricing_config')
        .maybeSingle();

      if (!providerErr && providerRow && providerRow.api_key) {
        try {
          const parsed = JSON.parse(providerRow.api_key);
          if (parsed && (parsed.basic || parsed.pro)) {
            const merged: PricingConfig = {
              basic: { ...DEFAULT_PRICING.basic, ...(parsed.basic || {}) },
              pro: { ...DEFAULT_PRICING.pro, ...(parsed.pro || {}) },
              updatedAt: parsed.updatedAt
            };
            cachedPricing = merged;
            return merged;
          }
        } catch (jsonErr) {
          console.warn('Error parsing pricing JSON from ai_providers:', jsonErr);
        }
      }
    }
  } catch (err) {
    console.warn('Error loading pricing config from Supabase:', err);
  }

  try {
    if (fs.existsSync(FALLBACK_FILE)) {
      const raw = fs.readFileSync(FALLBACK_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      const merged: PricingConfig = {
        basic: { ...DEFAULT_PRICING.basic, ...(parsed.basic || {}) },
        pro: { ...DEFAULT_PRICING.pro, ...(parsed.pro || {}) },
        updatedAt: parsed.updatedAt
      };
      cachedPricing = merged;
      return merged;
    }
  } catch (e) {
    console.warn('Error loading pricing local fallback:', e);
  }

  return DEFAULT_PRICING;
}

export async function savePricingConfig(config: Partial<PricingConfig>): Promise<PricingConfig> {
  const current = await getPricingConfig();
  const updated: PricingConfig = {
    basic: { ...current.basic, ...(config.basic || {}) },
    pro: { ...current.pro, ...(config.pro || {}) },
    updatedAt: new Date().toISOString()
  };

  // Update in-memory cache immediately
  cachedPricing = updated;

  // 1. Save to Supabase ai_providers table
  try {
    const isPlaceholder = !supabaseUrl || 
      supabaseUrl.includes('your-supabase-project-id') || 
      supabaseUrl.includes('placeholder-project');

    if (!isPlaceholder) {
      const jsonPayload = JSON.stringify(updated);
      const { data: existing } = await supabaseAdmin
        .from('ai_providers')
        .select('id')
        .eq('name', 'pricing_config')
        .maybeSingle();

      if (existing) {
        const { error: updateErr } = await supabaseAdmin
          .from('ai_providers')
          .update({
            api_key: jsonPayload,
            is_active: true
          })
          .eq('id', existing.id);

        if (updateErr) {
          console.error('Supabase update pricing_config error:', updateErr);
        }
      } else {
        const { error: insertErr } = await supabaseAdmin
          .from('ai_providers')
          .insert({
            name: 'pricing_config',
            api_key: jsonPayload,
            is_active: true,
            mode: 'single'
          });

        if (insertErr) {
          console.error('Supabase insert pricing_config error:', insertErr);
        }
      }
    }
  } catch (err) {
    console.warn('Could not save pricing config to Supabase:', err);
  }

  // 2. Also write to fallback file
  try {
    fs.writeFileSync(FALLBACK_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not write pricing fallback file:', err);
  }

  return updated;
}
