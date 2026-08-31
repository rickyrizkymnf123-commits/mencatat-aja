import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

const MOCK_TX_PATH = path.join(process.cwd(), 'src/lib/mock_transactions.json');

// Mock Categories list for mapping in mock mode
const MOCK_CATEGORIES = [
  { id: 'c1', name: 'Makanan', emoji: '🍜', type: 'expense' },
  { id: 'c2', name: 'Transport', emoji: '🚗', type: 'expense' },
  { id: 'c3', name: 'Hiburan', emoji: '🎮', type: 'expense' },
  { id: 'c4', name: 'Tagihan', emoji: '🏠', type: 'expense' },
  { id: 'c5', name: 'Belanja', emoji: '👕', type: 'expense' },
  { id: 'c6', name: 'Gaji', emoji: '💼', type: 'income' },
  { id: 'c7', name: 'Lainnya', emoji: '📦', type: 'expense' }
];

function getMockTransactions(userId: string) {
  if (!fs.existsSync(MOCK_TX_PATH)) return [];
  try {
    const raw = fs.readFileSync(MOCK_TX_PATH, 'utf-8');
    const all = JSON.parse(raw);
    if (!Array.isArray(all)) return [];
    return all.filter((t: any) => t.user_id === userId);
  } catch (e) {
    return [];
  }
}

function saveMockTransaction(tx: any) {
  let all: any[] = [];
  if (fs.existsSync(MOCK_TX_PATH)) {
    try {
      all = JSON.parse(fs.readFileSync(MOCK_TX_PATH, 'utf-8'));
      if (!Array.isArray(all)) all = [];
    } catch (e) {
      all = [];
    }
  }
  all.unshift(tx);
  fs.writeFileSync(MOCK_TX_PATH, JSON.stringify(all, null, 2));
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const isPlaceholder = !supabaseUrl || 
      supabaseUrl.includes('your-supabase-project-id') || 
      supabaseUrl.includes('placeholder-project');

    if (isPlaceholder) {
      const localTxs = getMockTransactions(userId);
      return NextResponse.json(localTxs);
    }

    const { data: transactions, error } = await supabaseAdmin
      .from('transactions')
      .select(`
        *,
        wallets (name),
        categories (name, emoji)
      `)
      .eq('user_id', userId)
      .order('transaction_date', { ascending: false });

    if (error) {
      console.error('Fetch transactions error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(transactions || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId, walletId, categoryId, amount, type, description, transferToWalletId, source } = await request.json();

    if (!userId || !walletId || !amount || !type || !description) {
      return NextResponse.json({ error: 'Missing required transaction fields' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const isPlaceholder = !supabaseUrl || 
      supabaseUrl.includes('your-supabase-project-id') || 
      supabaseUrl.includes('placeholder-project');

    if (isPlaceholder) {
      const cat = MOCK_CATEGORIES.find(c => c.id === categoryId) || MOCK_CATEGORIES.find(c => c.name === categoryId) || MOCK_CATEGORIES[6];
      const walletName = walletId.includes('wad1') || walletId.includes('wb1') || walletId.includes('wa1') ? 'BCA' : 'Cash';
      
      const newMockTx = {
        id: 'tx_mock_' + Date.now(),
        user_id: userId,
        wallet_id: walletId,
        category_id: cat.id,
        amount: Number(amount),
        type,
        description,
        transfer_to_wallet_id: transferToWalletId || null,
        transaction_date: new Date().toISOString(),
        source: source || 'web',
        wallets: { name: walletName },
        categories: { name: cat.name, emoji: cat.emoji }
      };

      saveMockTransaction(newMockTx);
      return NextResponse.json(newMockTx);
    }

    // Insert transaction in Supabase
    const { data: newTx, error } = await supabaseAdmin
      .from('transactions')
      .insert({
        user_id: userId,
        wallet_id: walletId,
        category_id: categoryId || null,
        amount: Number(amount),
        type,
        description,
        transfer_to_wallet_id: transferToWalletId || null,
        source: source || 'web'
      })
      .select(`
        *,
        wallets (name),
        categories (name, emoji)
      `)
      .single();

    if (error) {
      console.error('Insert transaction error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(newTx);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
