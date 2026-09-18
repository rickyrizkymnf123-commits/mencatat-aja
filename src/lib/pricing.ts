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

export async function getPricingConfig(): Promise<PricingConfig> {
  try {
    const isPlaceholder = !supabaseUrl || 
      supabaseUrl.includes('your-supabase-project-id') || 
      supabaseUrl.includes('placeholder-project');

    if (isPlaceholder) {
      if (fs.existsSync(FALLBACK_FILE)) {
        const raw = fs.readFileSync(FALLBACK_FILE, 'utf-8');
        return { ...DEFAULT_PRICING, ...JSON.parse(raw) };
      }
      return DEFAULT_PRICING;
    }

    const { data, error } = await supabaseAdmin
      .from('system_settings')
      .select('value')
      .eq('key', 'pricing_config')
      .single();

    if (!error && data && data.value) {
      return { ...DEFAULT_PRICING, ...data.value };
    }
  } catch (err) {
    console.warn('Error loading pricing config from Supabase, checking local fallback:', err);
  }

  try {
    if (fs.existsSync(FALLBACK_FILE)) {
      const raw = fs.readFileSync(FALLBACK_FILE, 'utf-8');
      return { ...DEFAULT_PRICING, ...JSON.parse(raw) };
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

  try {
    fs.writeFileSync(FALLBACK_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not write pricing fallback file:', err);
  }

  try {
    const isPlaceholder = !supabaseUrl || 
      supabaseUrl.includes('your-supabase-project-id') || 
      supabaseUrl.includes('placeholder-project');

    if (!isPlaceholder) {
      await supabaseAdmin
        .from('system_settings')
        .upsert({
          key: 'pricing_config',
          value: updated,
          updated_at: new Date().toISOString()
        });
    }
  } catch (err) {
    console.warn('Could not save pricing config to Supabase:', err);
  }

  return updated;
}
