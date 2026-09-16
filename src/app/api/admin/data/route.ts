import { NextResponse } from 'next/server';
import { supabaseAdmin, supabaseUrl } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const isPlaceholder = !supabaseUrl || 
      supabaseUrl.includes('your-supabase-project-id') || 
      supabaseUrl.includes('placeholder-project');

    if (isPlaceholder) {
      return NextResponse.json({
        success: true,
        users: [
          { id: 'usr_budi', name: 'Budi Santoso (Demo)', email: 'budi@demo.com', phone: '081234567890', plan: 'Pro', telegram: 'Terhubung (@budi_bot)', telegram_link_token: 'TD-112233', has_bot_token: true, txCount: 12, totalBalance: 5000000, wallets: [{ name: 'Cash', balance: 2000000 }, { name: 'BCA', balance: 3000000 }], is_approved: true, created_at: new Date().toISOString() },
          { id: 'usr_ani', name: 'Ani Wijaya (Demo)', email: 'ani@demo.com', phone: '089876543210', plan: 'Starter', telegram: 'Belum Terhubung', telegram_link_token: 'TD-445566', has_bot_token: false, txCount: 3, totalBalance: 150000, wallets: [{ name: 'Cash', balance: 150000 }], is_approved: true, created_at: new Date().toISOString() }
        ],
        payments: [],
        aiLogs: [],
        providers: [
          { id: '1', name: 'gemini', is_active: true, mode: 'single', token: '••••••••••••••••' },
          { id: '2', name: 'openai', is_active: false, mode: 'single', token: '' },
          { id: '3', name: 'deepseek', is_active: false, mode: 'single', token: '' }
        ]
      });
    }

    // 1. Fetch Users, Profiles, Transactions, Wallets, Payments, AI Logs in parallel with service_role
    const [authRes, profsRes, txRes, walletsRes, paysRes, logsRes, provsRes] = await Promise.all([
      supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
      supabaseAdmin.from('profiles').select('*').order('created_at', { ascending: false }),
      supabaseAdmin.from('transactions').select('user_id, amount, type'),
      supabaseAdmin.from('wallets').select('user_id, name, balance'),
      supabaseAdmin.from('payments').select('*, profiles (full_name, id)').order('created_at', { ascending: false }),
      supabaseAdmin.from('ai_logs').select('*, profiles (full_name)').order('created_at', { ascending: false }).limit(50),
      supabaseAdmin.from('ai_providers').select('*')
    ]);

    // Map Auth Users Email & Metadata
    const emailMap = new Map<string, string>();
    const metaMap = new Map<string, any>();
    if (authRes.data && authRes.data.users) {
      authRes.data.users.forEach(u => {
        emailMap.set(u.id, u.email || '-');
        metaMap.set(u.id, u.user_metadata || {});
      });
    }

    // Aggregate transactions per user
    const txCountMap = new Map<string, number>();
    if (txRes.data) {
      txRes.data.forEach(t => {
        txCountMap.set(t.user_id, (txCountMap.get(t.user_id) || 0) + 1);
      });
    }

    // Aggregate wallets per user
    const walletMap = new Map<string, any[]>();
    if (walletsRes.data) {
      walletsRes.data.forEach(w => {
        const list = walletMap.get(w.user_id) || [];
        list.push(w);
        walletMap.set(w.user_id, list);
      });
    }

    // Resolve Users
    const resolvedUsers: any[] = (profsRes.data || []).map(p => {
      const userEmail = emailMap.get(p.id) || '-';
      const txCount = txCountMap.get(p.id) || 0;
      const userWallets = walletMap.get(p.id) || [];
      const totalBalance = userWallets.reduce((acc, w) => acc + Number(w.balance || 0), 0);
      const hasBot = !!p.telegram_bot_token;

      let telegramStatus = 'Belum Terhubung';
      if (hasBot) {
        telegramStatus = 'Terhubung (Bot Kustom)';
      } else if (p.telegram_chat_id) {
        telegramStatus = `Terhubung (ID: ${p.telegram_chat_id})`;
      }

      return {
        id: p.id,
        name: p.full_name || metaMap.get(p.id)?.full_name || (userEmail !== '-' ? userEmail.split('@')[0] : 'User'),
        email: userEmail,
        phone: p.phone_number || '-',
        plan: p.plan || 'Starter',
        telegram: telegramStatus,
        telegram_link_token: p.telegram_link_token || '-',
        has_bot_token: hasBot,
        txCount,
        wallets: userWallets,
        totalBalance,
        is_approved: true,
        created_at: p.created_at
      };
    });

    // Also include any Auth users that might not have a profile yet
    if (authRes.data && authRes.data.users) {
      const existingProfileIds = new Set((profsRes.data || []).map(p => p.id));
      authRes.data.users.forEach(u => {
        if (!existingProfileIds.has(u.id)) {
          const userWallets = walletMap.get(u.id) || [];
          const totalBalance = userWallets.reduce((acc, w) => acc + Number(w.balance || 0), 0);
          resolvedUsers.push({
            id: u.id,
            name: u.user_metadata?.full_name || (u.email ? u.email.split('@')[0] : 'User Baru'),
            email: u.email || '-',
            phone: u.phone || '-',
            plan: 'Starter',
            telegram: 'Belum Terhubung',
            telegram_link_token: '-',
            has_bot_token: false,
            txCount: txCountMap.get(u.id) || 0,
            wallets: userWallets,
            totalBalance,
            is_approved: true,
            created_at: u.created_at
          });
        }
      });
    }

    // Format Payments
    const formattedPayments = (paysRes.data || []).map(p => ({
      id: p.id,
      userId: p.profiles?.id || p.user_id,
      user: p.profiles?.full_name || 'User',
      amount: `Rp ${Number(p.amount || 0).toLocaleString('id-ID')}`,
      plan: 'Pro',
      method: p.method === 'midtrans' ? 'Midtrans' : 'Manual Transfer',
      proof: p.payment_proof_url || '-',
      status: p.status,
      time: new Date(p.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
    }));

    // Format AI Logs
    const formattedLogs = (logsRes.data || []).map(l => ({
      id: l.id,
      user: l.profiles?.full_name || 'System / Webhook',
      provider: l.provider,
      action: l.action,
      tokens: `${l.prompt_tokens || 0} / ${l.completion_tokens || 0}`,
      cost: `$${Number(l.cost || 0).toFixed(6)}`,
      status: l.status || 'success',
      time: new Date(l.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
    }));

    // Format Providers
    const formattedProviders = (provsRes.data && provsRes.data.length > 0)
      ? provsRes.data.map(p => ({
          id: p.id,
          name: p.name,
          is_active: p.is_active,
          mode: p.mode,
          token: p.api_key ? '••••••••••••••••' : ''
        }))
      : [
          { id: '1', name: 'gemini', is_active: true, mode: 'single', token: '••••••••••••••••' },
          { id: '2', name: 'openai', is_active: false, mode: 'single', token: '' },
          { id: '3', name: 'deepseek', is_active: false, mode: 'single', token: '' }
        ];

    return NextResponse.json({
      success: true,
      users: resolvedUsers,
      payments: formattedPayments,
      aiLogs: formattedLogs,
      providers: formattedProviders
    });
  } catch (err: any) {
    console.error('Admin data fetch error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
