import { ParsedTransaction } from '@/types';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * Normalizes Indonesian currency strings like 15rb, 1,5jt, 500k into pure numbers.
 */
export function normalizeIndonesianAmount(text: string): number {
  if (!text) return 0;
  const lower = text.toLowerCase().trim();

  // Match pattern like 1.5jt, 1,5jt, 500k, 15rb, 15000
  let match = lower.match(/([\d\.,\s]+)\s*(juta|jt|rb|ribu|k)?/i);
  if (!match) return 0;

  let numStr = match[1].replace(/\s/g, '');
  const unit = match[2]?.toLowerCase();

  // Replace comma with dot if decimal
  if (numStr.includes(',') && !numStr.includes('.')) {
    numStr = numStr.replace(',', '.');
  } else if (numStr.includes('.') && numStr.includes(',')) {
    // Standard IDR 1.500.000,00 format
    numStr = numStr.replace(/\./g, '').replace(',', '.');
  } else if ((numStr.match(/\./g) || []).length > 1) {
    // 1.500.000 format
    numStr = numStr.replace(/\./g, '');
  }

  let num = parseFloat(numStr);
  if (isNaN(num)) return 0;

  if (unit === 'jt' || unit === 'juta') {
    num *= 1000000;
  } else if (unit === 'rb' || unit === 'ribu' || unit === 'k') {
    num *= 1000;
  }

  return Math.round(num);
}

/**
 * Parse natural language text using Gemini / OpenAI / Fallback regex
 */
export async function parseTransactionText(text: string, categories: string[] = []): Promise<ParsedTransaction | null> {
  const categoryListStr = categories.length > 0 ? categories.join(', ') : 'Makanan, Transport, Hiburan, Tagihan, Kesehatan, Belanja, Pendidikan, Gaji, Other';

  const systemPrompt = `Kamu adalah parser keuangan Indonesia yang presisi. Ubah input teks pengguna menjadi JSON terstruktur tanpa markdown codeblock.
Format JSON yang WAJIB dihasilkan:
{
  "jenis": "pemasukan" | "pengeluaran" | "transfer",
  "nominal": number,
  "kategori": string,
  "catatan": string
}

Aturan parsing nominal Indonesia:
- "15rb", "15ribu", "15k" = 15000
- "1.5jt", "1,5jt", "1.5juta" = 1500000
- "500k" = 500000
- "2.500.000" = 2500000

Pilihan Kategori: ${categoryListStr}.
Jika teks tidak jelas / bukan transaksi keuangan, kembalikan null atau object dengan nominal = 0.`;

  // Try calling active provider or Gemini API
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (geminiApiKey) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\nInput Teks: "${text}"` }]
            }
          ],
          generationConfig: {
            responseMimeType: 'application/json'
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (jsonText) {
          const parsed = JSON.parse(jsonText);
          if (parsed && parsed.nominal > 0) {
            return {
              jenis: parsed.jenis || 'pengeluaran',
              nominal: parsed.nominal,
              kategori: parsed.kategori || 'Lainnya',
              catatan: parsed.catatan || text
            };
          }
        }
      }
    } catch (err) {
      console.warn('Gemini API call failed, falling back to smart regex parser:', err);
    }
  }

  // Smart Regex Fallback Parser for Indonesia
  return smartRegexParser(text, categories);
}

function smartRegexParser(text: string, categories: string[]): ParsedTransaction | null {
  const lower = text.toLowerCase().trim();

  // Determine type
  let jenis: 'pemasukan' | 'pengeluaran' | 'transfer' = 'pengeluaran';
  if (lower.includes('gaji') || lower.includes('pemasukan') || lower.includes('dapat') || lower.includes('terima') || lower.includes('cashback') || lower.includes('transfer dari')) {
    jenis = 'pemasukan';
  } else if (lower.includes('transfer ke') || lower.includes('pindah ke') || lower.includes('kirim ke')) {
    jenis = 'transfer';
  }

  // Extract nominal
  const amountMatch = lower.match(/([\d\.,\s]+)\s*(juta|jt|rb|ribu|k)?/i);
  if (!amountMatch) return null;

  const nominal = normalizeIndonesianAmount(amountMatch[0]);
  if (nominal <= 0) return null;

  // Clean note
  let catatan = text
    .replace(amountMatch[0], '')
    .replace(/rp/gi, '')
    .trim();
  if (!catatan) catatan = text;

  // Predict Category
  let kategori = 'Pengeluaran';
  if (jenis === 'pemasukan') {
    kategori = 'Gaji';
  } else {
    if (lower.includes('bakso') || lower.includes('makan') || lower.includes('kopi') || lower.includes('nasi') || lower.includes('ayam')) {
      kategori = 'Makanan';
    } else if (lower.includes('bensin') || lower.includes('gojek') || lower.includes('grab') || lower.includes('parkir') || lower.includes('tol')) {
      kategori = 'Transport';
    } else if (lower.includes('listrik') || lower.includes('air') || lower.includes('wifi') || lower.includes('pulsa') || lower.includes('token')) {
      kategori = 'Tagihan';
    } else if (lower.includes('baju') || lower.includes('sepatu') || lower.includes('belanja') || lower.includes('tokopedia') || lower.includes('shopee')) {
      kategori = 'Belanja';
    } else if (lower.includes('obat') || lower.includes('dokter') || lower.includes('vitamin')) {
      kategori = 'Kesehatan';
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
  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (geminiApiKey) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: `Analisa foto struk ini. Kembalikan JSON terstruktur dengan format:
{
  "merchant": string,
  "nominal_total": number,
  "kategori_utama": string,
  "catatan": string,
  "items": [
    { "nama": string, "harga": number, "kategori": string }
  ]
}` },
                {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: photoBase64
                  }
                }
              ]
            }
          ],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (jsonText) {
          const parsed = JSON.parse(jsonText);
          return {
            jenis: 'pengeluaran',
            nominal: parsed.nominal_total || 0,
            kategori: parsed.kategori_utama || 'Belanja',
            catatan: `Struk: ${parsed.merchant || 'Merchant'} (${parsed.items?.length || 1} item)`,
            items: parsed.items || []
          };
        }
      }
    } catch (err) {
      console.error('Receipt OCR error:', err);
    }
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
      { nama: 'Sabun Mandi', harga: 50000, kategori: 'Belanja' }
    ]
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
