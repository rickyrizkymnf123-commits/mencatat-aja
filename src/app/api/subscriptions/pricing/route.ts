import { NextResponse } from 'next/server';
import { getPricingConfig, savePricingConfig } from '@/lib/pricing';

export async function GET() {
  try {
    const pricing = await getPricingConfig();
    return NextResponse.json({ success: true, pricing });
  } catch (err: any) {
    console.error('Error getting pricing:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const updated = await savePricingConfig(body);
    return NextResponse.json({ success: true, message: 'Harga paket berhasil diperbarui', pricing: updated });
  } catch (err: any) {
    console.error('Error saving pricing:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
