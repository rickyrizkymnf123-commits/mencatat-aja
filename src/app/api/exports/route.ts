import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId } = body;

    const supabase = createAdminClient();
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*, wallet:wallets(*), category:categories(*)')
      .eq('user_id', userId)
      .order('transaction_date', { ascending: false });

    if (!transactions) {
      return NextResponse.json({ ok: false, error: 'No data' });
    }

    // Build CSV string natively
    const headers = ['Tanggal', 'Jenis', 'Nominal', 'Wallet', 'Kategori', 'Catatan', 'Sumber'];
    const rows = transactions.map((t) => [
      new Date(t.transaction_date).toISOString(),
      t.type,
      t.amount,
      t.wallet?.name || '',
      t.category?.name || '',
      `"${(t.notes || '').replace(/"/g, '""')}"`,
      t.source,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="mencatat_export.csv"',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
