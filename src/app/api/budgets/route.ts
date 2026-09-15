import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

const MOCK_BUDGETS_PATH = path.join(process.cwd(), 'src/lib/mock_budgets.json');

const CATEGORY_MAP: Record<string, { name: string; emoji: string }> = {
  'c1': { name: 'Makanan', emoji: '🍜' },
  'c2': { name: 'Transport', emoji: '🚗' },
  'c3': { name: 'Hiburan', emoji: '🎮' },
  'c4': { name: 'Tagihan', emoji: '🏠' },
  'c5': { name: 'Belanja', emoji: '👕' },
  'c6': { name: 'Gaji', emoji: '💼' },
  'c7': { name: 'Lainnya', emoji: '📦' }
};

function getMockBudgets(userId: string, period: string) {
  let all: any[] = [];
  if (fs.existsSync(MOCK_BUDGETS_PATH)) {
    try {
      all = JSON.parse(fs.readFileSync(MOCK_BUDGETS_PATH, 'utf-8'));
    } catch (e) {
      all = [];
    }
  }

  const userBudgets = all.filter((b: any) => b.user_id === userId && b.period === period);
  if (userBudgets.length === 0) {
    const seed = [
      {
        id: `b1_${userId}`,
        user_id: userId,
        category_id: 'c1',
        monthly_limit: 2000000,
        current_spent: 0,
        period,
        categories: CATEGORY_MAP['c1']
      },
      {
        id: `b2_${userId}`,
        user_id: userId,
        category_id: 'c2',
        monthly_limit: 1000000,
        current_spent: 0,
        period,
        categories: CATEGORY_MAP['c2']
      }
    ];
    all = [...all, ...seed];
    fs.writeFileSync(MOCK_BUDGETS_PATH, JSON.stringify(all, null, 2));
    return seed;
  }
  return userBudgets;
}

function saveMockBudget(budget: any) {
  let all: any[] = [];
  if (fs.existsSync(MOCK_BUDGETS_PATH)) {
    try {
      all = JSON.parse(fs.readFileSync(MOCK_BUDGETS_PATH, 'utf-8'));
    } catch (e) {}
  }
  
  // Upsert
  let exists = false;
  all = all.map((b: any) => {
    if (b.user_id === budget.user_id && b.category_id === budget.category_id && b.period === budget.period) {
      exists = true;
      return { ...b, monthly_limit: budget.monthly_limit };
    }
    return b;
  });
  
  if (!exists) {
    all.push(budget);
  }
  
  fs.writeFileSync(MOCK_BUDGETS_PATH, JSON.stringify(all, null, 2));
}

const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
const SUPERADMIN_ID = '58c09700-965d-4104-a344-6e599c46deff';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const targetUserId = (userId && isUUID(userId)) ? userId : SUPERADMIN_ID;
    const period = searchParams.get('period') || new Date().toISOString().substring(0, 7);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const isPlaceholder = !supabaseUrl || 
      supabaseUrl.includes('your-supabase-project-id') || 
      supabaseUrl.includes('placeholder-project');

    if (isPlaceholder) {
      return NextResponse.json(getMockBudgets(targetUserId, period));
    }

    const { data: budgets, error } = await supabaseAdmin
      .from('budgets')
      .select('*, categories(name, emoji)')
      .eq('user_id', targetUserId)
      .eq('period', period);

    if (error) {
      console.error('Fetch budgets error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(budgets || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId, categoryId, monthlyLimit, period } = await request.json();
    const targetUserId = (userId && isUUID(userId)) ? userId : SUPERADMIN_ID;

    if (!categoryId || monthlyLimit === undefined) {
      return NextResponse.json({ error: 'Missing required budget fields' }, { status: 400 });
    }

    const budgetPeriod = period || new Date().toISOString().substring(0, 7);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const isPlaceholder = !supabaseUrl || 
      supabaseUrl.includes('your-supabase-project-id') || 
      supabaseUrl.includes('placeholder-project');

    if (isPlaceholder) {
      const mockBudget = {
        id: `b_${Date.now()}`,
        user_id: targetUserId,
        category_id: categoryId,
        monthly_limit: Number(monthlyLimit),
        current_spent: 0,
        period: budgetPeriod,
        categories: CATEGORY_MAP[categoryId] || { name: 'Lainnya', emoji: '📦' }
      };
      
      saveMockBudget(mockBudget);
      return NextResponse.json(mockBudget);
    }

    // Upsert budget
    const { data: budget, error } = await supabaseAdmin
      .from('budgets')
      .upsert({
        user_id: targetUserId,
        category_id: categoryId,
        monthly_limit: Number(monthlyLimit),
        period: budgetPeriod,
      }, {
        onConflict: 'user_id,category_id,period'
      })
      .select()
      .single();

    if (error) {
      console.error('Upsert budget error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(budget);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
