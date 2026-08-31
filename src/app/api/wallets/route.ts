import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';
import { autoStartPollingIfConfigured } from '@/lib/telegram-polling';

const MOCK_WALLETS_PATH = path.join(process.cwd(), 'src/lib/mock_wallets.json');

// Initialize mock wallets if file doesn't exist
function getMockWallets(userId: string) {
  let all: any[] = [];
  if (fs.existsSync(MOCK_WALLETS_PATH)) {
    try {
      all = JSON.parse(fs.readFileSync(MOCK_WALLETS_PATH, 'utf-8'));
    } catch (e) {
      all = [];
    }
  }

  // Seed default wallets if empty for this user
  const userWallets = all.filter((w: any) => w.user_id === userId);
  if (userWallets.length === 0) {
    const seed = [
      {
        id: `w_bca_${userId}`,
        user_id: userId,
        name: 'BCA',
        balance: 80000000,
        is_default: true,
        created_at: new Date().toISOString()
      },
      {
        id: `w_cash_${userId}`,
        user_id: userId,
        name: 'Cash',
        balance: 1500000,
        is_default: false,
        created_at: new Date().toISOString()
      }
    ];
    all = [...all, ...seed];
    fs.writeFileSync(MOCK_WALLETS_PATH, JSON.stringify(all, null, 2));
    return seed;
  }

  return userWallets;
}

function updateMockWalletBalance(userId: string, walletId: string, newBalance: number) {
  let all: any[] = [];
  if (fs.existsSync(MOCK_WALLETS_PATH)) {
    try {
      all = JSON.parse(fs.readFileSync(MOCK_WALLETS_PATH, 'utf-8'));
    } catch (e) {}
  }
  
  all = all.map((w: any) => {
    if (w.user_id === userId && (w.id === walletId || w.name === walletId)) {
      return { ...w, balance: newBalance };
    }
    return w;
  });
  
  fs.writeFileSync(MOCK_WALLETS_PATH, JSON.stringify(all, null, 2));
}

function saveNewMockWallet(wallet: any) {
  let all: any[] = [];
  if (fs.existsSync(MOCK_WALLETS_PATH)) {
    try {
      all = JSON.parse(fs.readFileSync(MOCK_WALLETS_PATH, 'utf-8'));
    } catch (e) {}
  }
  all.push(wallet);
  fs.writeFileSync(MOCK_WALLETS_PATH, JSON.stringify(all, null, 2));
}
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const customToken = searchParams.get('custom_token');

    if (customToken) {
      try {
        const fallbackPath = path.join(process.cwd(), 'src/lib/ai_config_fallback.json');
        let fallbackData: any = {};
        if (fs.existsSync(fallbackPath)) {
          fallbackData = JSON.parse(fs.readFileSync(fallbackPath, 'utf-8'));
        }
        if (!fallbackData.botToken || fallbackData.botToken !== customToken) {
          fallbackData.botToken = customToken;
          fs.writeFileSync(fallbackPath, JSON.stringify(fallbackData, null, 2), 'utf-8');
          console.log('Saved custom bot token to ai_config_fallback.json from wallet GET request');
        }
      } catch (writeErr) {
        console.error('Failed to write botToken from GET request:', writeErr);
      }
    }

    autoStartPollingIfConfigured();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const isPlaceholder = !supabaseUrl || 
      supabaseUrl.includes('your-supabase-project-id') || 
      supabaseUrl.includes('placeholder-project');

    if (isPlaceholder) {
      return NextResponse.json(getMockWallets(userId));
    }

    const { data: wallets, error } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Fetch wallets error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(wallets || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId, name, balance, isDefault } = await request.json();

    if (!userId || !name) {
      return NextResponse.json({ error: 'User ID and Wallet Name are required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const isPlaceholder = !supabaseUrl || 
      supabaseUrl.includes('your-supabase-project-id') || 
      supabaseUrl.includes('placeholder-project');

    if (isPlaceholder) {
      const current = getMockWallets(userId);
      const isFirst = current.length === 0;
      
      const newWallet = {
        id: `w_${Date.now()}`,
        user_id: userId,
        name,
        balance: Number(balance) || 0.00,
        is_default: isFirst ? true : (isDefault || false),
        created_at: new Date().toISOString()
      };
      
      saveNewMockWallet(newWallet);
      
      // Update defaults if needed
      if (newWallet.is_default && !isFirst) {
        let all = JSON.parse(fs.readFileSync(MOCK_WALLETS_PATH, 'utf-8'));
        all = all.map((w: any) => {
          if (w.user_id === userId && w.id !== newWallet.id) {
            return { ...w, is_default: false };
          }
          return w;
        });
        fs.writeFileSync(MOCK_WALLETS_PATH, JSON.stringify(all, null, 2));
      }
      
      return NextResponse.json(newWallet);
    }

    // Check if this is the first wallet
    const { count } = await supabaseAdmin
      .from('wallets')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const isFirst = count === 0;

    const { data: newWallet, error } = await supabaseAdmin
      .from('wallets')
      .insert({
        user_id: userId,
        name,
        balance: Number(balance) || 0.00,
        is_default: isFirst ? true : (isDefault || false),
      })
      .select()
      .single();

    if (error) {
      console.error('Insert wallet error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If marked as default, unset previous default wallets
    if (newWallet.is_default && !isFirst) {
      await supabaseAdmin
        .from('wallets')
        .update({ is_default: false })
        .eq('user_id', userId)
        .neq('id', newWallet.id);
    }

    return NextResponse.json(newWallet);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { userId, walletId, name, balance } = await request.json();
    if (!userId || !walletId || !name) {
      return NextResponse.json({ error: 'Missing wallet update fields' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const isPlaceholder = !supabaseUrl || 
      supabaseUrl.includes('your-supabase-project-id') || 
      supabaseUrl.includes('placeholder-project');

    if (isPlaceholder) {
      let all: any[] = [];
      if (fs.existsSync(MOCK_WALLETS_PATH)) {
        all = JSON.parse(fs.readFileSync(MOCK_WALLETS_PATH, 'utf-8'));
      }
      
      let updatedWallet: any = null;
      all = all.map((w: any) => {
        if (w.user_id === userId && w.id === walletId) {
          updatedWallet = { ...w, name, balance: Number(balance) };
          return updatedWallet;
        }
        return w;
      });
      
      fs.writeFileSync(MOCK_WALLETS_PATH, JSON.stringify(all, null, 2));
      return NextResponse.json(updatedWallet || { error: 'Wallet not found' });
    }

    const { data: updated, error } = await supabaseAdmin
      .from('wallets')
      .update({ name, balance: Number(balance) })
      .eq('user_id', userId)
      .eq('id', walletId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const walletId = searchParams.get('walletId');

    if (!userId || !walletId) {
      return NextResponse.json({ error: 'Missing userId or walletId' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const isPlaceholder = !supabaseUrl || 
      supabaseUrl.includes('your-supabase-project-id') || 
      supabaseUrl.includes('placeholder-project');

    if (isPlaceholder) {
      let all: any[] = [];
      if (fs.existsSync(MOCK_WALLETS_PATH)) {
        all = JSON.parse(fs.readFileSync(MOCK_WALLETS_PATH, 'utf-8'));
      }
      all = all.filter((w: any) => !(w.user_id === userId && w.id === walletId));
      fs.writeFileSync(MOCK_WALLETS_PATH, JSON.stringify(all, null, 2));
      return NextResponse.json({ success: true });
    }

    const { error } = await supabaseAdmin
      .from('wallets')
      .delete()
      .eq('user_id', userId)
      .eq('id', walletId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
