import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

const MOCK_CATEGORIES_PATH = path.join(process.cwd(), 'src/lib/mock_categories.json');

const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
const SUPERADMIN_ID = '58c09700-965d-4104-a344-6e599c46deff';

const DEFAULT_CATEGORIES = [
  { id: 'c1', name: 'Makanan', emoji: '🍜', color: '#FF8A00', type: 'expense' },
  { id: 'c2', name: 'Transport', emoji: '🚗', color: '#00A3FF', type: 'expense' },
  { id: 'c3', name: 'Hiburan', emoji: '🎮', color: '#9E00FF', type: 'expense' },
  { id: 'c4', name: 'Tagihan', emoji: '🏠', color: '#FF005C', type: 'expense' },
  { id: 'c5', name: 'Belanja', emoji: '👕', color: '#FFB800', type: 'expense' },
  { id: 'c6', name: 'Gaji', emoji: '💼', color: '#00E047', type: 'income' },
  { id: 'c7', name: 'Bonus', emoji: '🎁', color: '#FF0099', type: 'income' },
  { id: 'c8', name: 'Freelance', emoji: '💻', color: '#00D1FF', type: 'income' },
  { id: 'c9', name: 'Investasi', emoji: '📈', color: '#9E00FF', type: 'income' },
  { id: 'c10', name: 'Lainnya', emoji: '📦', color: '#888888', type: 'expense' }
];

function getMockCategories(userId: string) {
  let custom: any[] = [];
  if (fs.existsSync(MOCK_CATEGORIES_PATH)) {
    try {
      custom = JSON.parse(fs.readFileSync(MOCK_CATEGORIES_PATH, 'utf-8'));
    } catch (e) {}
  }
  const userCustom = custom.filter((c: any) => c.user_id === userId);
  return [...DEFAULT_CATEGORIES, ...userCustom];
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const targetUserId = (userId && isUUID(userId)) ? userId : SUPERADMIN_ID;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const isPlaceholder = !supabaseUrl || 
      supabaseUrl.includes('your-supabase-project-id') || 
      supabaseUrl.includes('placeholder-project');

    if (isPlaceholder) {
      return NextResponse.json(getMockCategories(targetUserId));
    }

    const { data: categories, error } = await supabaseAdmin
      .from('categories')
      .select('*')
      .or(`user_id.eq.${targetUserId},user_id.is.null`)
      .order('name', { ascending: true });

    if (error) {
      console.error('Fetch categories error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (categories && Array.isArray(categories)) {
      const seen = new Map<string, any>();
      for (const cat of categories) {
        const key = `${cat.name?.trim().toLowerCase()}_${cat.type || 'expense'}`;
        if (!seen.has(key) || (cat.user_id === targetUserId)) {
          seen.set(key, cat);
        }
      }
      return NextResponse.json(Array.from(seen.values()));
    }

    return NextResponse.json(categories || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId, name, emoji, color, type } = await request.json();
    const targetUserId = (userId && isUUID(userId)) ? userId : SUPERADMIN_ID;

    if (!name || !emoji || !color || !type) {
      return NextResponse.json({ error: 'Missing required category fields' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const isPlaceholder = !supabaseUrl || 
      supabaseUrl.includes('your-supabase-project-id') || 
      supabaseUrl.includes('placeholder-project');

    if (isPlaceholder) {
      const newCategory = {
        id: `c_${Date.now()}`,
        user_id: targetUserId,
        name,
        emoji,
        color,
        type
      };
      
      let all: any[] = [];
      if (fs.existsSync(MOCK_CATEGORIES_PATH)) {
        try {
          all = JSON.parse(fs.readFileSync(MOCK_CATEGORIES_PATH, 'utf-8'));
        } catch (e) {}
      }
      all.push(newCategory);
      fs.writeFileSync(MOCK_CATEGORIES_PATH, JSON.stringify(all, null, 2));
      return NextResponse.json(newCategory);
    }

    const { data: newCategory, error } = await supabaseAdmin
      .from('categories')
      .insert({
        user_id: targetUserId,
        name,
        emoji,
        color,
        type,
      })
      .select()
      .single();

    if (error) {
      console.error('Insert category error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(newCategory);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { userId, categoryId, name, emoji, color, type } = await request.json();
    const targetUserId = (userId && isUUID(userId)) ? userId : SUPERADMIN_ID;

    if (!categoryId || !name || !emoji) {
      return NextResponse.json({ error: 'Missing required category update fields' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const isPlaceholder = !supabaseUrl || 
      supabaseUrl.includes('your-supabase-project-id') || 
      supabaseUrl.includes('placeholder-project');

    if (isPlaceholder) {
      if (categoryId.startsWith('c') && !categoryId.includes('_')) {
        return NextResponse.json({ error: 'Cannot update default categories' }, { status: 403 });
      }

      let all: any[] = [];
      if (fs.existsSync(MOCK_CATEGORIES_PATH)) {
        try {
          all = JSON.parse(fs.readFileSync(MOCK_CATEGORIES_PATH, 'utf-8'));
        } catch (e) {}
      }
      let updatedCat: any = null;
      all = all.map((c: any) => {
        if (c.user_id === targetUserId && c.id === categoryId) {
          updatedCat = { ...c, name, emoji, color: color || c.color, type: type || c.type };
          return updatedCat;
        }
        return c;
      });
      fs.writeFileSync(MOCK_CATEGORIES_PATH, JSON.stringify(all, null, 2));
      return NextResponse.json(updatedCat || { error: 'Category not found' });
    }

    const { data: updated, error } = await supabaseAdmin
      .from('categories')
      .update({ name, emoji, color, type })
      .eq('user_id', targetUserId)
      .eq('id', categoryId)
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
    const categoryId = searchParams.get('categoryId');
    const targetUserId = (userId && isUUID(userId)) ? userId : SUPERADMIN_ID;

    if (!categoryId) {
      return NextResponse.json({ error: 'Missing categoryId' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const isPlaceholder = !supabaseUrl || 
      supabaseUrl.includes('your-supabase-project-id') || 
      supabaseUrl.includes('placeholder-project');

    if (isPlaceholder) {
      if (categoryId.startsWith('c') && !categoryId.includes('_')) {
        return NextResponse.json({ error: 'Cannot delete default categories' }, { status: 403 });
      }

      let all: any[] = [];
      if (fs.existsSync(MOCK_CATEGORIES_PATH)) {
        try {
          all = JSON.parse(fs.readFileSync(MOCK_CATEGORIES_PATH, 'utf-8'));
        } catch (e) {}
      }
      all = all.filter((c: any) => !(c.id === categoryId));
      fs.writeFileSync(MOCK_CATEGORIES_PATH, JSON.stringify(all, null, 2));
      return NextResponse.json({ success: true });
    }

    // 1. Unlink referencing transactions to prevent FK constraint error
    try {
      await supabaseAdmin
        .from('transactions')
        .update({ category_id: null })
        .eq('category_id', categoryId);
    } catch (txErr) {
      console.warn('Warning unlinking transactions for deleted category:', txErr);
    }

    // 2. Delete referencing budgets
    try {
      await supabaseAdmin
        .from('budgets')
        .delete()
        .eq('category_id', categoryId);
    } catch (bgErr) {
      console.warn('Warning deleting budgets for deleted category:', bgErr);
    }

    // 3. Delete the category record
    const { error } = await supabaseAdmin
      .from('categories')
      .delete()
      .eq('id', categoryId);

    if (error) {
      console.error('Delete category Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
