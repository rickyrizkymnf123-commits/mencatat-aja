import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const adminClient = createAdminClient();
    const targetUserId = user?.id;

    if (!targetUserId) {
      return NextResponse.json({
        ok: true,
        wallets: [
          { id: 'w1', user_id: 'demo', name: 'Cash / Tunai', balance: 1250000, is_default: true, color: '#10b981', icon: 'wallet' },
          { id: 'w2', user_id: 'demo', name: 'BCA Utama', balance: 8450000, is_default: false, color: '#3b82f6', icon: 'credit-card' },
          { id: 'w3', user_id: 'demo', name: 'GoPay', balance: 350000, is_default: false, color: '#00a5cf', icon: 'smartphone' },
        ],
      });
    }

    const { data: wallets, error } = await adminClient
      .from('wallets')
      .select('*')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, wallets: wallets || [] });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const adminClient = createAdminClient();

    const body = await req.json();
    const { name, balance, color, isDefault } = body;

    if (!name) {
      return NextResponse.json({ ok: false, error: 'Nama dompet wajib diisi' }, { status: 400 });
    }

    const userId = user?.id || 'demo-user-123';

    if (user?.id) {
      const { data: profile } = await adminClient
        .from('profiles')
        .select('plan')
        .eq('id', user.id)
        .maybeSingle();

      const { count } = await adminClient
        .from('wallets')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (profile?.plan === 'starter' && count && count >= 3) {
        return NextResponse.json({
          ok: false,
          error: 'Maksimal 3 dompet untuk Paket Starter. Upgrade ke Paket Pro untuk membuat dompet tanpa batas!',
        }, { status: 403 });
      }
    }

    const { data: existingWallets } = await adminClient
      .from('wallets')
      .select('id')
      .eq('user_id', userId);

    const shouldBeDefault = isDefault || !existingWallets || existingWallets.length === 0;

    if (shouldBeDefault && existingWallets && existingWallets.length > 0) {
      await adminClient.from('wallets').update({ is_default: false }).eq('user_id', userId);
    }

    const { data: newWallet, error } = await adminClient
      .from('wallets')
      .insert({
        user_id: userId,
        name,
        balance: parseFloat(balance) || 0,
        is_default: shouldBeDefault,
        color: color || '#10b981',
        icon: 'wallet',
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (shouldBeDefault) {
      await adminClient.from('wallets').update({ is_default: false }).eq('user_id', userId).neq('id', newWallet.id);
      await adminClient.from('profiles').update({ default_wallet_id: newWallet.id }).eq('id', userId);
    }

    return NextResponse.json({ ok: true, wallet: newWallet });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const adminClient = createAdminClient();

    const { walletId, isDefault, balance, name } = await req.json();
    const userId = user?.id || 'demo-user-123';

    if (!walletId) {
      return NextResponse.json({ ok: false, error: 'walletId wajib diisi' }, { status: 400 });
    }

    if (isDefault) {
      await adminClient.from('wallets').update({ is_default: false }).eq('user_id', userId);
      await adminClient.from('wallets').update({ is_default: true }).eq('id', walletId);
      await adminClient.from('profiles').update({ default_wallet_id: walletId }).eq('id', userId);
    }

    const updatePayload: any = { updated_at: new Date().toISOString() };
    if (balance !== undefined) updatePayload.balance = parseFloat(balance);
    if (name !== undefined) updatePayload.name = name;

    const { data: updatedWallet, error } = await adminClient
      .from('wallets')
      .update(updatePayload)
      .eq('id', walletId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, wallet: updatedWallet });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
