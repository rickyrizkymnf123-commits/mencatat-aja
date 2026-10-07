import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { userAnswers } = await req.json(); // e.g. "Karyawan swasta suka jajan kopi, naik MRT, dan ada cicilan motor"

    const prompt = `User profil: "${userAnswers || 'Karyawan swasta umum'}".
Rekomendasikan 8 kategori transaksi keuangan terpenting untuk user ini dalam format JSON array tanpa markdown.
Setiap item objek harus memiliki: name (string), emoji (string), color (hex color), type ("income" | "expense"), default_budget (number).`;

    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (geminiApiKey) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (jsonText) {
            const categories = JSON.parse(jsonText);
            return NextResponse.json({ ok: true, categories });
          }
        }
      } catch (err) {
        console.warn('AI Category recommendation fall back to smart default:', err);
      }
    }

    // Default smart AI response
    const defaultCategories = [
      { name: 'Makanan & Minuman', emoji: '🍜', color: '#10b981', type: 'expense', default_budget: 1500000 },
      { name: 'Transportasi', emoji: '🚗', color: '#3b82f6', type: 'expense', default_budget: 800000 },
      { name: 'Hiburan & Jajan', emoji: '🎮', color: '#8b5cf6', type: 'expense', default_budget: 500000 },
      { name: 'Tagihan & Rutin', emoji: '🏠', color: '#f59e0b', type: 'expense', default_budget: 1200000 },
      { name: 'Kesehatan', emoji: '💊', color: '#ef4444', type: 'expense', default_budget: 300000 },
      { name: 'Belanja Personal', emoji: '👕', color: '#ec4899', type: 'expense', default_budget: 600000 },
      { name: 'Pendidikan & Buku', emoji: '📚', color: '#14b8a6', type: 'expense', default_budget: 400000 },
      { name: 'Gaji Utama', emoji: '💰', color: '#10b981', type: 'income', default_budget: 0 },
    ];

    return NextResponse.json({ ok: true, categories: defaultCategories });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
