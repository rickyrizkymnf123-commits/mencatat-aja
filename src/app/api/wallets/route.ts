import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';
import { autoStartPollingIfConfigured } from '@/lib/telegram-polling';

const MOCK_WALLETS_PATH = path.join(process.cwd(), 'src/lib/mock_wallets.json');

const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
const SUPERADMIN_ID = '58c09700-965d-4104-a344-6e599c46deff';

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
        balance: 0,
        is_default: true,
        created_at: new Date().toISOString()
      },
      {
        id: `w_cash_${userId}`,
        user_id: userId,
        name: 'Cash',
        balance: 0,
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

    const targetUserId = (userId && isUUID(userId)) ? userId : SUPERADMIN_ID;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const isPlaceholder = !supabaseUrl || 
      supabaseUrl.includes('your-supabase-project-id') || 
      supabaseUrl.includes('placeholder-project');

    if (isPlaceholder) {
      return NextResponse.json(getMockWallets(targetUserId));
    }

    const { data: wallets, error } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('user_id', targetUserId)
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

    const targetUserId = (userId && isUUID(userId)) ? userId : SUPERADMIN_ID;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const isPlaceholder = !supabaseUrl || 
      supabaseUrl.includes('your-supabase-project-id') || 
      supabaseUrl.includes('placeholder-project');

    if (isPlaceholder) {
      const current = getMockWallets(targetUserId);
      const isFirst = current.length === 0;
      
      const newWallet = {
        id: `w_${Date.now()}`,
        user_id: targetUserId,
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
          if (w.user_id === targetUserId && w.id !== newWallet.id) {
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
      .eq('user_id', targetUserId);

    const isFirst = count === 0;

    const { data: newWallet, error } = await supabaseAdmin
      .from('wallets')
      .insert({
        user_id: targetUserId,
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
        .eq('user_id', targetUserId)
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
    if (!walletId || !name) {
      return NextResponse.json({ error: 'Missing wallet update fields' }, { status: 400 });
    }

    const targetUserId = (userId && isUUID(userId)) ? userId : SUPERADMIN_ID;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const isPlaceholder = !supabaseUrl || 
      supabaseUrl.includes('your-supabase-project-id') || 
      supabaseUrl.includes('placeholder-project');

    // Update in mock file if present
    try {
      if (fs.existsSync(MOCK_WALLETS_PATH)) {
        let all = JSON.parse(fs.readFileSync(MOCK_WALLETS_PATH, 'utf-8'));
        all = all.map((w: any) => {
          if ((w.user_id === targetUserId || w.user_id === userId) && (w.id === walletId || w.name === walletId)) {
            return { ...w, name, balance: Number(balance) };
          }
          return w;
        });
        fs.writeFileSync(MOCK_WALLETS_PATH, JSON.stringify(all, null, 2));
      }
    } catch (e) {}

    if (isPlaceholder) {
      return NextResponse.json({ id: walletId, user_id: targetUserId, name, balance: Number(balance) });
    }

    if (isUUID(walletId)) {
      const { data: updated, error } = await supabaseAdmin
        .from('wallets')
        .update({ name, balance: Number(balance) })
        .eq('user_id', targetUserId)
        .eq('id', walletId)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json(updated);
    } else {
      // Non-UUID: match by name
      const { data: existing } = await supabaseAdmin
        .from('wallets')
        .select('*')
        .eq('user_id', targetUserId);
      const matched = existing?.find(w => w.id === walletId || w.name.toLowerCase() === name.toLowerCase());
      if (matched) {
        const { data: updated } = await supabaseAdmin
          .from('wallets')
          .update({ name, balance: Number(balance) })
          .eq('id', matched.id)
          .select()
          .single();
        return NextResponse.json(updated || matched);
      }
      return NextResponse.json({ id: walletId, name, balance: Number(balance) });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const walletId = searchParams.get('walletId');

    if (!walletId) {
      return NextResponse.json({ error: 'Missing walletId' }, { status: 400 });
    }

    const targetUserId = (userId && isUUID(userId)) ? userId : SUPERADMIN_ID;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const isPlaceholder = !supabaseUrl || 
      supabaseUrl.includes('your-supabase-project-id') || 
      supabaseUrl.includes('placeholder-project');

    // Always clean up mock file if it exists
    try {
      if (fs.existsSync(MOCK_WALLETS_PATH)) {
        let all = JSON.parse(fs.readFileSync(MOCK_WALLETS_PATH, 'utf-8'));
        all = all.filter((w: any) => !( (w.user_id === targetUserId || w.user_id === userId) && (w.id === walletId || w.name === walletId) ));
        fs.writeFileSync(MOCK_WALLETS_PATH, JSON.stringify(all, null, 2));
      }
    } catch (e) {}

    if (isPlaceholder) {
      return NextResponse.json({ success: true });
    }

    if (isUUID(walletId)) {
      // 1. First remove foreign key references in transactions to prevent constraint violation
      try {
        await supabaseAdmin
          .from('transactions')
          .delete()
          .eq('user_id', targetUserId)
          .eq('wallet_id', walletId);

        await supabaseAdmin
          .from('transactions')
          .delete()
          .eq('user_id', targetUserId)
          .eq('transfer_to_wallet_id', walletId);
      } catch (fkErr) {
        console.warn('Failed to cleanup transactions for deleted wallet:', fkErr);
      }

      // 2. Delete the wallet
      const { error } = await supabaseAdmin
        .from('wallets')
        .delete()
        .eq('user_id', targetUserId)
        .eq('id', walletId);

      if (error) {
        console.error('Delete wallet error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // 3. If there are remaining wallets and none is default, set the first one as default
      try {
        const { data: remaining } = await supabaseAdmin
          .from('wallets')
          .select('*')
          .eq('user_id', targetUserId);
        
        if (remaining && remaining.length > 0 && !remaining.some(w => w.is_default)) {
          await supabaseAdmin
            .from('wallets')
            .update({ is_default: true })
            .eq('id', remaining[0].id);
        }
      } catch (e) {}
    } else {
      // Non-UUID mock wallet ID: also attempt deleting by name if a match exists in Supabase
      try {
        const { data: matchedWallets } = await supabaseAdmin
          .from('wallets')
          .select('*')
          .eq('user_id', targetUserId);
        
        const matched = matchedWallets?.find(w => w.id === walletId || w.name.toLowerCase() === walletId.toLowerCase());
        if (matched) {
          await supabaseAdmin.from('transactions').delete().eq('user_id', targetUserId).eq('wallet_id', matched.id);
          await supabaseAdmin.from('transactions').delete().eq('user_id', targetUserId).eq('transfer_to_wallet_id', matched.id);
          await supabaseAdmin.from('wallets').delete().eq('id', matched.id);
        }
      } catch (e) {}
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
