'use client';

import React, { useState, useEffect } from 'react';
import { Target, AlertTriangle, CheckCircle2, Edit2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatIDR } from '@/lib/telegram';
import { Category } from '@/types';

export default function BudgetPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [budgetInput, setBudgetInput] = useState('');

  useEffect(() => {
    loadBudgets();
  }, []);

  async function loadBudgets() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: cList } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'expense');

    if (cList) setCategories(cList);
  }

  async function handleSaveBudget(catId: string) {
    const supabase = createClient();
    const newBudget = parseFloat(budgetInput);
    if (isNaN(newBudget)) return;

    await supabase.from('categories').update({ monthly_budget: newBudget }).eq('id', catId);
    setEditingCatId(null);
    setBudgetInput('');
    loadBudgets();
  }

  return (
    <div className="space-y-6 font-sans text-slate-100">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Budget per Kategori</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Atur batas anggaran bulanan per kategori. Peringatan otomatis dikirim via Telegram saat mencapai 80% dan 100%.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {categories.map((cat) => {
          const budget = Number(cat.monthly_budget || 0);
          const used = Math.round(budget * 0.45);
          const percent = budget > 0 ? Math.round((used / budget) * 100) : 0;
          const isWarning = percent >= 80 && percent < 100;
          const isExceeded = percent >= 100;

          return (
            <div key={cat.id} className="p-5 glass-card rounded-3xl border border-slate-800 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-xl">
                    {cat.emoji || '📁'}
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white">{cat.name}</h3>
                    <span className="text-xs text-slate-400">Target Budget Bulanan</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setEditingCatId(cat.id);
                    setBudgetInput(String(cat.monthly_budget || ''));
                  }}
                  className="p-2 text-slate-400 hover:text-emerald-400 rounded-lg hover:bg-slate-800 transition-all"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>

              {editingCatId === cat.id ? (
                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="number"
                    value={budgetInput}
                    onChange={(e) => setBudgetInput(e.target.value)}
                    placeholder="Batas Budget (Rp)"
                    className="flex-1 px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-bold focus:outline-none"
                  />
                  <button
                    onClick={() => handleSaveBudget(cat.id)}
                    className="px-4 py-2 bg-emerald-500 text-slate-950 rounded-xl text-xs font-black"
                  >
                    Simpan
                  </button>
                  <button
                    onClick={() => setEditingCatId(null)}
                    className="px-2 py-2 text-xs text-slate-400 hover:text-white"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300">
                      Terpakai: <span className="font-black text-white">{formatIDR(used)}</span>
                    </span>
                    <span className="font-semibold text-slate-400">
                      Budget: <span className="font-black text-white">{formatIDR(budget)}</span>
                    </span>
                  </div>

                  <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        isExceeded ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(percent, 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-bold">{percent}% terpakai</span>
                    {isExceeded ? (
                      <span className="text-rose-400 font-bold flex items-center space-x-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Budget Habis!</span>
                      </span>
                    ) : isWarning ? (
                      <span className="text-amber-400 font-bold flex items-center space-x-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Hampir Habis (&gt;80%)</span>
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-bold flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Aman</span>
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
