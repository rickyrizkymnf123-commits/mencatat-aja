import { NextResponse } from 'next/server';
import { supabaseAdmin, supabaseUrl } from '@/lib/supabase';
import { parseTransactionText } from '@/lib/ai'; // we can customize parser for onboarding

export async function POST(request: Request) {
  try {
    const { userId, onboardingAnswer, defaultWallets, fullName, phoneNumber } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const isPlaceholder = !supabaseUrl || 
      supabaseUrl.includes('your-supabase-project-id') || 
      supabaseUrl.includes('placeholder-project');

    if (isPlaceholder) {
      console.log('Using simulated onboarding fallback because Supabase URL is not configured.');
      const randVal = Math.floor(100000 + Math.random() * 900000);
      return NextResponse.json({
        success: true,
        telegramLinkToken: `TD-${randVal}`
      });
    }

    // 1. Generate unique Telegram Link Token (TD-XXXXXX)
    let telegramLinkToken = '';
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 10) {
      const randVal = Math.floor(100000 + Math.random() * 900000);
      telegramLinkToken = `TD-${randVal}`;
      
      const { data } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('telegram_link_token', telegramLinkToken)
        .maybeSingle();
      
      if (!data) {
        isUnique = true;
      }
      attempts++;
    }

    // 2. Create or Update Profile
    const isSuperadminId = userId === '58c09700-965d-4104-a344-6e599c46deff';
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        full_name: fullName || 'Nasabah Baru',
        phone_number: phoneNumber || null,
        telegram_link_token: telegramLinkToken,
        plan: 'Basic',
        is_approved: isSuperadminId ? true : false,
        monthly_transaction_limit: 50,
      });

    if (profileError) {
      console.error('Onboarding profile error:', profileError);
      return NextResponse.json({ error: 'Failed to create profile: ' + profileError.message }, { status: 500 });
    }

    // 3. Create Default Wallets
    const walletsToCreate = defaultWallets && defaultWallets.length > 0
      ? defaultWallets
      : ['Cash', 'BCA'];
    
    const walletInserts = walletsToCreate.map((w: string, index: number) => ({
      user_id: userId,
      name: w,
      balance: 0.00,
      is_default: index === 0, // mark the first one as default
    }));

    const { error: walletError } = await supabaseAdmin
      .from('wallets')
      .insert(walletInserts);

    if (walletError) {
      console.error('Onboarding wallets error:', walletError);
    }

    // 4. Generate AI Recommendations for Categories based on onboarding answer
    let customCategories = [
      { name: 'Makanan', emoji: '🍜', color: '#FF8A00', type: 'expense' },
      { name: 'Transport', emoji: '🚗', color: '#00A3FF', type: 'expense' },
      { name: 'Hiburan', emoji: '🎮', color: '#9E00FF', type: 'expense' },
      { name: 'Tagihan', emoji: '🏠', color: '#FF005C', type: 'expense' },
      { name: 'Belanja', emoji: '👕', color: '#FFB800', type: 'expense' },
      { name: 'Gaji', emoji: '💼', color: '#00E047', type: 'income' },
      { name: 'Bonus', emoji: '🎁', color: '#FF0099', type: 'income' },
      { name: 'Freelance', emoji: '💻', color: '#00D1FF', type: 'income' },
      { name: 'Investasi', emoji: '📈', color: '#9E00FF', type: 'income' }
    ];

    if (onboardingAnswer && onboardingAnswer.trim().length > 5) {
      try {
        // Call AI to recommend categories
        const providers = await supabaseAdmin
          .from('ai_providers')
          .select('name, api_key')
          .eq('is_active', true);
        
        let apiKey = process.env.GEMINI_API_KEY;
        let providerName = 'gemini';

        if (providers.data && providers.data.length > 0) {
          const activeProv = providers.data[0];
          const { decrypt } = await import('@/lib/crypto');
          apiKey = decrypt(activeProv.api_key);
          providerName = activeProv.name;
        }

        if (apiKey) {
          const prompt = `
          Berdasarkan profil singkat user berikut, rekomendasikan 6-8 kategori keuangan (pemasukan & pengeluaran) yang paling relevan untuk mereka dalam bentuk array JSON objek.
          
          Profil user: "${onboardingAnswer}"
          
          Setiap kategori harus memiliki emoji yang cocok, warna heksadesimal yang modern (aksen premium), nama, dan tipe ('expense' atau 'income').
          Contoh output format JSON (kembalikan array JSON ini saja tanpa penjelasan markdown):
          [
            { "name": "Kopi & Kafe", "emoji": "☕", "color": "#8B4513", "type": "expense" },
            { "name": "Gaji Freelance", "emoji": "💻", "color": "#00FF00", "type": "income" }
          ]
          `;

          let rawResponse = '';
          if (providerName === 'gemini') {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
            const response = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: 'application/json' }
              })
            });
            if (response.ok) {
              const resJson = await response.json();
              rawResponse = resJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
            }
          }

          if (rawResponse.trim()) {
            let cleanedText = rawResponse.trim();
            if (cleanedText.startsWith('```')) {
              cleanedText = cleanedText.replace(/^```json\n/, '').replace(/\n```$/, '');
            }
            const parsed = JSON.parse(cleanedText);
            if (Array.isArray(parsed) && parsed.length > 0) {
              customCategories = parsed;
            }
          }
        }
      } catch (err) {
        console.error('Failed to get AI onboarding categories, using default fallback:', err);
      }
    }

    // Insert custom categories
    const categoryInserts = customCategories.map((c: any) => ({
      user_id: userId,
      name: c.name,
      emoji: c.emoji,
      color: c.color,
      type: c.type,
    }));

    const { error: categoryError } = await supabaseAdmin
      .from('categories')
      .insert(categoryInserts);

    if (categoryError) {
      console.error('Onboarding categories error:', categoryError);
    }

    return NextResponse.json({
      success: true,
      telegramLinkToken,
    });
  } catch (err: any) {
    console.error('Onboarding route error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
