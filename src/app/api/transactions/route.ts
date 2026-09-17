import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

const MOCK_TX_PATH = path.join(process.cwd(), 'src/lib/mock_transactions.json');

const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
const SUPERADMIN_ID = '58c09700-965d-4104-a344-6e599c46deff';

// Categories list for fallback
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

// 1. GET TRANSACTIONS
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const targetUserId = (userId && isUUID(userId)) ? userId : SUPERADMIN_ID;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const isPlaceholder = !supabaseUrl || 
      supabaseUrl.includes('your-supabase-project-id') || 
      supabaseUrl.includes('placeholder-project');

    if (isPlaceholder) {
      const localTxs = getMockTransactions(targetUserId);
      return NextResponse.json(localTxs);
    }

    const { data: transactions, error } = await supabaseAdmin
      .from('transactions')
      .select(`
        *,
        wallets:wallets!transactions_wallet_id_fkey (name),
        categories (name, emoji)
      `)
      .eq('user_id', targetUserId)
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

// 2. POST (CREATE TRANSACTION)
export async function POST(request: Request) {
  try {
    const { userId, walletId, categoryId, amount, type, description, transferToWalletId, source, transactionDate } = await request.json();

    if (!userId || !walletId || !amount || !type || !description) {
      return NextResponse.json({ error: 'Missing required transaction fields' }, { status: 400 });
    }

    const targetUserId = (userId && isUUID(userId)) ? userId : SUPERADMIN_ID;
    const numAmount = Number(amount);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const isPlaceholder = !supabaseUrl || 
      supabaseUrl.includes('your-supabase-project-id') || 
      supabaseUrl.includes('placeholder-project');

    if (isPlaceholder) {
      const cat = MOCK_CATEGORIES.find(c => c.id === categoryId) || MOCK_CATEGORIES.find(c => c.name === categoryId) || MOCK_CATEGORIES[6];
      const walletName = walletId.includes('wad1') || walletId.includes('wb1') || walletId.includes('wa1') ? 'BCA' : 'Cash';
      
      const newMockTx = {
        id: 'tx_mock_' + Date.now(),
        user_id: targetUserId,
        wallet_id: walletId,
        category_id: cat.id,
        amount: numAmount,
        type,
        description,
        transfer_to_wallet_id: transferToWalletId || null,
        transaction_date: transactionDate || new Date().toISOString(),
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
        user_id: targetUserId,
        wallet_id: walletId,
        category_id: categoryId || null,
        amount: numAmount,
        type,
        description,
        transfer_to_wallet_id: transferToWalletId || null,
        transaction_date: transactionDate || new Date().toISOString(),
        source: source || 'web'
      })
      .select(`
        *,
        wallets:wallets!transactions_wallet_id_fkey (name),
        categories (name, emoji)
      `)
      .single();

    if (error) {
      console.error('Insert transaction error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update wallet balance in Supabase
    try {
      const { data: currentWallet } = await supabaseAdmin.from('wallets').select('balance').eq('id', walletId).single();
      if (currentWallet) {
        let newBalance = Number(currentWallet.balance || 0);
        if (type === 'expense') {
          newBalance -= numAmount;
        } else if (type === 'income') {
          newBalance += numAmount;
        } else if (type === 'transfer') {
          newBalance -= numAmount;
          if (transferToWalletId) {
            const { data: destWallet } = await supabaseAdmin.from('wallets').select('balance').eq('id', transferToWalletId).single();
            if (destWallet) {
              await supabaseAdmin.from('wallets').update({ balance: Number(destWallet.balance || 0) + numAmount }).eq('id', transferToWalletId);
            }
          }
        }
        await supabaseAdmin.from('wallets').update({ balance: newBalance }).eq('id', walletId);
      }
    } catch (wErr) {
      console.warn('Wallet balance sync warning:', wErr);
    }

    return NextResponse.json(newTx);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

// 3. PUT / PATCH (EDIT TRANSACTION)
export async function PUT(request: Request) {
  try {
    const { id, amount, type, description, categoryId, walletId, transferToWalletId, transactionDate } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const isPlaceholder = !supabaseUrl || 
      supabaseUrl.includes('your-supabase-project-id') || 
      supabaseUrl.includes('placeholder-project');

    if (isPlaceholder) {
      return NextResponse.json({ success: true, message: 'Transaction updated' });
    }

    // 1. Fetch old transaction to calculate wallet delta
    const { data: oldTx, error: fetchErr } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !oldTx) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const oldAmount = Number(oldTx.amount || 0);
    const newAmount = amount !== undefined ? Number(amount) : oldAmount;
    const oldType = oldTx.type;
    const newType = type || oldType;
    const oldWalletId = oldTx.wallet_id;
    const newWalletId = walletId || oldWalletId;
    const oldDestWalletId = oldTx.transfer_to_wallet_id;
    const newDestWalletId = transferToWalletId !== undefined ? transferToWalletId : oldDestWalletId;

    // 2. Reverse old wallet balance impact
    try {
      const { data: origWallet } = await supabaseAdmin.from('wallets').select('balance').eq('id', oldWalletId).single();
      if (origWallet) {
        let revBalance = Number(origWallet.balance || 0);
        if (oldType === 'expense' || oldType === 'transfer') {
          revBalance += oldAmount;
        } else if (oldType === 'income') {
          revBalance -= oldAmount;
        }
        await supabaseAdmin.from('wallets').update({ balance: revBalance }).eq('id', oldWalletId);
      }

      if (oldType === 'transfer' && oldDestWalletId) {
        const { data: origDest } = await supabaseAdmin.from('wallets').select('balance').eq('id', oldDestWalletId).single();
        if (origDest) {
          await supabaseAdmin.from('wallets').update({ balance: Number(origDest.balance || 0) - oldAmount }).eq('id', oldDestWalletId);
        }
      }

      // 3. Apply new wallet balance impact
      const { data: targetWallet } = await supabaseAdmin.from('wallets').select('balance').eq('id', newWalletId).single();
      if (targetWallet) {
        let finalBalance = Number(targetWallet.balance || 0);
        if (newType === 'expense' || newType === 'transfer') {
          finalBalance -= newAmount;
        } else if (newType === 'income') {
          finalBalance += newAmount;
        }
        await supabaseAdmin.from('wallets').update({ balance: finalBalance }).eq('id', newWalletId);
      }

      if (newType === 'transfer' && newDestWalletId) {
        const { data: newDest } = await supabaseAdmin.from('wallets').select('balance').eq('id', newDestWalletId).single();
        if (newDest) {
          await supabaseAdmin.from('wallets').update({ balance: Number(newDest.balance || 0) + newAmount }).eq('id', newDestWalletId);
        }
      }
    } catch (wErr) {
      console.warn('Wallet balance adjustment error during update:', wErr);
    }

    // 4. Update the transaction record in database
    const updateData: any = {};
    if (amount !== undefined) updateData.amount = newAmount;
    if (type !== undefined) updateData.type = newType;
    if (description !== undefined) updateData.description = description;
    if (categoryId !== undefined) updateData.category_id = categoryId || null;
    if (walletId !== undefined) updateData.wallet_id = newWalletId;
    if (transferToWalletId !== undefined) updateData.transfer_to_wallet_id = newDestWalletId;
    if (transactionDate !== undefined) updateData.transaction_date = transactionDate;

    const { data: updatedTx, error: updateErr } = await supabaseAdmin
      .from('transactions')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        wallets:wallets!transactions_wallet_id_fkey (name),
        categories (name, emoji)
      `)
      .single();

    if (updateErr) {
      console.error('Update transaction error:', updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, transaction: updatedTx });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

// 4. DELETE (DELETE TRANSACTION)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await request.json();
        id = body.id;
      } catch {
        // Body might be empty
      }
    }

    if (!id) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const isPlaceholder = !supabaseUrl || 
      supabaseUrl.includes('your-supabase-project-id') || 
      supabaseUrl.includes('placeholder-project');

    if (isPlaceholder) {
      return NextResponse.json({ success: true, message: 'Transaction deleted' });
    }

    // 1. Fetch transaction to reverse wallet balance impact
    const { data: tx, error: fetchErr } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('id', id)
      .single();

    if (tx) {
      const amt = Number(tx.amount || 0);
      try {
        // Reverse source wallet
        const { data: w } = await supabaseAdmin.from('wallets').select('balance').eq('id', tx.wallet_id).single();
        if (w) {
          let revertedBalance = Number(w.balance || 0);
          if (tx.type === 'expense' || tx.type === 'transfer') {
            revertedBalance += amt;
          } else if (tx.type === 'income') {
            revertedBalance -= amt;
          }
          await supabaseAdmin.from('wallets').update({ balance: revertedBalance }).eq('id', tx.wallet_id);
        }

        // Reverse transfer destination wallet
        if (tx.type === 'transfer' && tx.transfer_to_wallet_id) {
          const { data: destW } = await supabaseAdmin.from('wallets').select('balance').eq('id', tx.transfer_to_wallet_id).single();
          if (destW) {
            await supabaseAdmin.from('wallets').update({ balance: Number(destW.balance || 0) - amt }).eq('id', tx.transfer_to_wallet_id);
          }
        }
      } catch (wErr) {
        console.warn('Wallet balance reversal error on delete:', wErr);
      }
    }

    // 2. Delete transaction from database
    const { error: delErr } = await supabaseAdmin
      .from('transactions')
      .delete()
      .eq('id', id);

    if (delErr) {
      console.error('Delete transaction error:', delErr);
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Transaksi berhasil dihapus' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
