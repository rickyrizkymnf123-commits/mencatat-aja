import { NextResponse } from 'next/server';
import { parseTransactionText } from '@/lib/ai';

function localRegexParser(text: string, categoriesList: any[]) {
  let amount = 0;
  const kMatch = text.match(/\b(\d+)\s*(rb|ribu|k)\b/i);
  const numMatch = text.match(/\b\d+([.,]\d+)?\b/);
  
  if (kMatch) {
    amount = Number(kMatch[1]) * 1000;
  } else if (numMatch) {
    amount = Number(numMatch[0].replace(/[.,]/g, ''));
  }

  let type: 'expense' | 'income' | 'transfer' = 'expense';
  const lowercaseText = text.toLowerCase();
  
  if (lowercaseText.includes('gaji') || lowercaseText.includes('masuk') || lowercaseText.includes('bonus') || lowercaseText.includes('pemasukan') || lowercaseText.includes('dapat')) {
    type = 'income';
  } else if (lowercaseText.includes('transfer') || lowercaseText.includes('pindah') || lowercaseText.includes('kirim')) {
    type = 'transfer';
  }

  let category: string | null = null;
  for (const cat of categoriesList) {
    if (lowercaseText.includes(cat.name.toLowerCase())) {
      category = cat.name;
      break;
    }
  }

  if (!category) {
    if (type === 'income') {
      category = 'Gaji';
    } else if (type === 'expense') {
      if (lowercaseText.includes('makan') || lowercaseText.includes('minum') || lowercaseText.includes('kopi') || lowercaseText.includes('bakso')) {
        category = 'Makanan';
      } else if (lowercaseText.includes('bensin') || lowercaseText.includes('ojek') || lowercaseText.includes('mobil') || lowercaseText.includes('gojek')) {
        category = 'Transport';
      } else if (lowercaseText.includes('game') || lowercaseText.includes('nonton') || lowercaseText.includes('bioskop')) {
        category = 'Hiburan';
      } else {
        category = 'Belanja';
      }
    }
  }

  let description = text
    .replace(/\b\d+([.,]\d+)?\b/g, '')
    .replace(/\b(\d+)\s*(rb|ribu|k)\b/ig, '')
    .replace(/(beli|catat|pemasukan|pengeluaran|transfer|pindah|gaji)/ig, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!description) {
    description = type === 'expense' ? 'Pengeluaran Manual' : type === 'income' ? 'Pemasukan Manual' : 'Transfer Manual';
  }

  return {
    type,
    amount,
    category,
    description
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text, userId, categories, wallets, prompt, baseUrl, apiKey, model } = body;

    if (prompt) {
      if (!baseUrl) {
        return NextResponse.json({ error: 'Base URL is required to test AI connection' }, { status: 400 });
      }
      const { callCustomLLMAPI } = await import('@/lib/ai');
      const testRes = await callCustomLLMAPI(baseUrl, apiKey || '', model || 'gemini-2.5-flash', prompt);
      return NextResponse.json({ success: true, reply: testRes.text });
    }

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const categoriesList = categories || [];
    const walletsList = wallets || [];

    // Try calling active AI parser
    try {
      const result = await parseTransactionText(text, categoriesList, walletsList, userId);
      return NextResponse.json({ success: true, parsed: result, parser: 'ai' });
    } catch (aiErr: any) {
      console.warn('AI Parsing failed, falling back to local Regex parser:', aiErr.message || aiErr);
      const result = localRegexParser(text, categoriesList);
      return NextResponse.json({ success: true, parsed: result, parser: 'regex' });
    }
  } catch (err: any) {
    console.error('Parse API route error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
