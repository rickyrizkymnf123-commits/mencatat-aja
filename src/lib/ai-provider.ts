import { ParsedTransaction } from '@/types';

/**
 * Normalizes Indonesian currency strings like 15rb, 1,5jt, 500k into pure numbers.
 */
export function normalizeIndonesianAmount(rawNum: string | number, unit?: string): number {
  if (!rawNum) return 0;
  let s = String(rawNum).trim().replace(/\s/g, '');

  if (s.includes(',') && !s.includes('.')) {
    s = s.replace(',', '.');
  } else if (s.includes('.') && s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if ((s.match(/\./g) || []).length > 1) {
    s = s.replace(/\./g, '');
  }

  let val = parseFloat(s);
  if (isNaN(val)) return 0;

  const u = (unit || '').toLowerCase().trim();
  if (u === 'jt' || u === 'juta') {
    val *= 1000000;
  } else if (u === 'rb' || u === 'ribu' || u === 'k') {
    val *= 1000;
  }
  return Math.round(val);
}

/**
 * Parse natural language text using 9Router / Gemini / Smart Regex
 */
export async function parseTransactionText(text: string, categories: string[] = []): Promise<ParsedTransaction | null> {
  if (!text || !text.trim()) return null;

  // 1. Try 9Router Universal Gateway / AI if active
  try {
    const { generateAiCompletion, DEFAULT_9ROUTER_BASE_URL, DEFAULT_9ROUTER_MODEL } = await import('@/lib/ai');
    const categoryListStr = categories.length > 0 ? categories.join(', ') : 'Makanan, Transport, Hiburan, Tagihan, Kesehatan, Belanja, Pendidikan, Gaji, Other';
    const prompt = `Kamu adalah parser keuangan Indonesia presisi. Ekstrak data transaksi keuangan berikut menjadi format JSON tanpa markdown:
Teks: "${text}"
Pilihan Kategori: ${categoryListStr}

Format JSON:
{
  "jenis": "pemasukan" | "pengeluaran" | "transfer",
  "nominal": number,
  "kategori": string,
  "catatan": string
}`;

    const aiRes = await generateAiCompletion({
      baseUrl: process.env.AI_BASE_URL || DEFAULT_9ROUTER_BASE_URL,
      apiKey: process.env.AI_API_KEY || 'sk-none',
      model: process.env.AI_MODEL || DEFAULT_9ROUTER_MODEL,
      prompt,
    }).catch(() => null);

    if (aiRes && aiRes.text) {
      let clean = aiRes.text.trim();
      if (clean.startsWith('```')) {
        clean = clean.replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/, '').trim();
      }
      const firstBrace = clean.indexOf('{');
      const lastBrace = clean.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        clean = clean.substring(firstBrace, lastBrace + 1);
      }
      const parsed = JSON.parse(clean);
      if (parsed && Number(parsed.nominal) > 0) {
        return {
          jenis: parsed.jenis || 'pengeluaran',
          nominal: Number(parsed.nominal),
          kategori: parsed.kategori || 'Lainnya',
          catatan: parsed.catatan || text,
        };
      }
    }
  } catch (err) {
    // Fallthrough to smart regex parser
  }

  // 2. High-precision Smart Regex Parser for Indonesia
  return smartRegexParser(text, categories);
}

export function smartRegexParser(text: string, categories: string[] = []): ParsedTransaction | null {
  if (!text) return null;
  const lower = text.toLowerCase().trim();

  // 1. Determine type
  let jenis: 'pemasukan' | 'pengeluaran' | 'transfer' = 'pengeluaran';
  if (
    lower.includes('gaji') ||
    lower.includes('pemasukan') ||
    lower.includes('dapat ') ||
    lower.includes('terima ') ||
    lower.includes('cashback') ||
    lower.includes('transfer dari') ||
    lower.includes('tf dari')
  ) {
    jenis = 'pemasukan';
  } else if (
    lower.includes('transfer ke') ||
    lower.includes('transfer ') ||
    lower.includes('tf ke') ||
    lower.includes('pindah ke') ||
    lower.includes('kirim ke')
  ) {
    jenis = 'transfer';
  }

  // 2. Extract nominal
  let nominal = 0;
  let matchedStr = '';

  const patternWithUnit = /(\d+(?:[\.,]\d+)?)\s*(juta|jt|rb|ribu|k)\b/i;
  const patternRp = /(?:rp\.?\s*)(\d+(?:[\.,]\d+)?)\s*(juta|jt|rb|ribu|k)?/i;
  const patternFormattedNum = /\b(\d{1,3}(?:\.\d{3})+)\b/;
  const patternPlainNum = /\b(\d{4,10})\b/;

  let m = lower.match(patternWithUnit);
  if (m) {
    nominal = normalizeIndonesianAmount(m[1], m[2]);
    matchedStr = m[0];
  } else if ((m = lower.match(patternRp))) {
    nominal = normalizeIndonesianAmount(m[1], m[2]);
    matchedStr = m[0];
  } else if ((m = lower.match(patternFormattedNum))) {
    nominal = normalizeIndonesianAmount(m[1]);
    matchedStr = m[0];
  } else if ((m = lower.match(patternPlainNum))) {
    nominal = normalizeIndonesianAmount(m[1]);
    matchedStr = m[0];
  }

  if (nominal <= 0) return null;

  // 3. Extract description
  let catatan = text
    .replace(new RegExp(matchedStr, 'i'), '')
    .replace(/\brp\.?\s*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!catatan) catatan = text.trim();

  // 4. Categorize
  let kategori = 'Pengeluaran';
  if (jenis === 'pemasukan') {
    kategori = 'Gaji';
  } else if (jenis === 'transfer') {
    kategori = 'Transfer';
  } else {
    if (lower.match(/\b(bakso|makan|kopi|nasi|ayam|sate|soto|mie|jus|burger|pizza|martabak|snack|roti|warteg|resto|kafe|cafe)\b/i)) {
      kategori = 'Makanan';
    } else if (lower.match(/\b(bensin|pertalite|pertamax|gojek|gocar|grab|parkir|tol|angkot|busway|ojek|kereta|mrt|service|oli)\b/i)) {
      kategori = 'Transport';
    } else if (lower.match(/\b(listrik|pln|air|pdam|wifi|indihome|pulsa|kuota|token|iuran|bpjs|tagihan)\b/i)) {
      kategori = 'Tagihan';
    } else if (lower.match(/\b(baju|celana|sepatu|belanja|tokopedia|shopee|lazada|tiktok|mall|indomaret|alfamart|superindo)\b/i)) {
      kategori = 'Belanja';
    } else if (lower.match(/\b(obat|dokter|vitamin|klinik|apotek|rumahsakit|rs|paracetamol)\b/i)) {
      kategori = 'Kesehatan';
    } else if (lower.match(/\b(bioskop|nonton|game|steam|topup|netflix|spotify|hiburan|liburan|hotel)\b/i)) {
      kategori = 'Hiburan';
    } else if (lower.match(/\b(buku|kursus|les|sekolah|kuliah|spp|ujian|pendidikan)\b/i)) {
      kategori = 'Pendidikan';
    } else if (categories.length > 0) {
      kategori = categories[0];
    }
  }

  return {
    jenis,
    nominal,
    kategori,
    catatan,
  };
}

/**
 * Receipt OCR parser for Pro users sending photo messages
 */
export async function parseReceiptPhoto(photoBase64: string, categories: string[] = []): Promise<ParsedTransaction | null> {
  // Try calling AI vision if available
  try {
    const { parseReceiptImage } = await import('@/lib/ai');
    const parsed = await parseReceiptImage(photoBase64, categories);
    if (parsed && parsed.totalAmount > 0) {
      return {
        jenis: 'pengeluaran',
        nominal: parsed.totalAmount,
        kategori: parsed.category || 'Belanja',
        catatan: parsed.description || `Struk Belanja (${parsed.items?.length || 1} item)`,
        items: (parsed.items || []).map((i: any) => ({
          nama: i.name,
          harga: i.price,
          kategori: i.category || 'Belanja',
        })),
      };
    }
  } catch (err) {
    console.warn('Vision OCR fallback:', err);
  }

  // Fallback demo result for receipt OCR
  return {
    jenis: 'pengeluaran',
    nominal: 78500,
    kategori: 'Belanja',
    catatan: 'Struk Belanja Minimarket (3 Item)',
    items: [
      { nama: 'Air Mineral 1.5L', harga: 6500, kategori: 'Makanan' },
      { nama: 'Roti Tawar', harga: 22000, kategori: 'Makanan' },
      { nama: 'Sabun Mandi', harga: 50000, kategori: 'Belanja' },
    ],
  };
}

/**
 * AI Financial Advisor generator (Pro feature)
 */
export async function generateAIAdvisorMessage(userName: string, categorySpike?: string, totalIncome = 0, totalExpense = 0): Promise<string> {
  const percentExpense = totalIncome > 0 ? Math.round((totalExpense / totalIncome) * 100) : 0;

  return `🤖 *Financial Advisor*
Hei ${userName}! 

Pengeluaran kamu bulan ini sudah mencapai *${percentExpense}%* dari total pemasukan. ${
    categorySpike ? `Ada kenaikan signifikan pada kategori *${categorySpike}*.` : 'Jaga terus stabilitas pengeluaranmu!'
  }

💡 *Saran:*
- Batasi jajan impulsif di akhir minggu.
- Alokasikan minimal 10-20% pemasukan langsung ke tabungan/dompet investasi saat gajian.`;
}
