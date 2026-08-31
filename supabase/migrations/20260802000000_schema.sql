-- Supabase Database Schema Migration for TataDana

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES TABLE
create table if not exists profiles (
    id uuid references auth.users on delete cascade primary key,
    full_name text,
    phone_number text unique,
    telegram_chat_id bigint unique,
    telegram_link_token text unique,
    telegram_bot_token text, -- encrypted user-configured bot token (BYOB)
    avatar_url text,
    currency text default 'IDR',
    plan text default 'Starter' check (plan in ('Starter', 'Pro')),
    monthly_transaction_limit int default 50,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- RLS for profiles
alter table profiles enable row level security;
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- 2. WALLETS TABLE
create table if not exists wallets (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references profiles(id) on delete cascade not null,
    name text not null,
    balance numeric(15,2) default 0.00 not null,
    is_default boolean default false not null,
    created_at timestamptz default now()
);

-- RLS for wallets
alter table wallets enable row level security;
create policy "Users can manage own wallets" on wallets for all using (auth.uid() = user_id);

-- 3. CATEGORIES TABLE
create table if not exists categories (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references profiles(id) on delete cascade, -- null means global default category
    name text not null,
    emoji text not null,
    color text not null,
    type text not null check (type in ('expense', 'income')),
    created_at timestamptz default now()
);

-- RLS for categories
alter table categories enable row level security;
create policy "Users can view global or own categories" on categories for select using (user_id is null or auth.uid() = user_id);
create policy "Users can manage own categories" on categories for all using (auth.uid() = user_id);

-- 4. BUDGETS TABLE
create table if not exists budgets (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references profiles(id) on delete cascade not null,
    category_id uuid references categories(id) on delete cascade not null,
    monthly_limit numeric(15,2) not null,
    current_spent numeric(15,2) default 0.00 not null,
    period text not null, -- format 'YYYY-MM'
    created_at timestamptz default now(),
    unique (user_id, category_id, period)
);

-- RLS for budgets
alter table budgets enable row level security;
create policy "Users can manage own budgets" on budgets for all using (auth.uid() = user_id);

-- 5. TRANSACTIONS TABLE
create table if not exists transactions (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references profiles(id) on delete cascade not null,
    wallet_id uuid references wallets(id) on delete set null,
    category_id uuid references categories(id) on delete set null, -- null for transfers
    amount numeric(15,2) not null,
    type text not null check (type in ('expense', 'income', 'transfer')),
    description text,
    transaction_date timestamptz default now() not null,
    transfer_to_wallet_id uuid references wallets(id) on delete set null, -- used only if type = 'transfer'
    ocr_structured_data jsonb, -- detail item struk
    source text default 'web' check (source in ('web', 'telegram')),
    created_at timestamptz default now()
);

-- RLS for transactions
alter table transactions enable row level security;
create policy "Users can manage own transactions" on transactions for all using (auth.uid() = user_id);

-- 6. TRANSACTION_ITEMS TABLE (OCR items)
create table if not exists transaction_items (
    id uuid default gen_random_uuid() primary key,
    transaction_id uuid references transactions(id) on delete cascade not null,
    name text not null,
    price numeric(15,2) not null,
    quantity int default 1 not null,
    category_id uuid references categories(id) on delete set null,
    created_at timestamptz default now()
);

-- RLS for transaction_items
alter table transaction_items enable row level security;
create policy "Users can manage own transaction items" on transaction_items for all using (
    exists (select 1 from transactions where id = transaction_id and user_id = auth.uid())
);

-- 7. AI_PROVIDERS TABLE (Admin setting)
create table if not exists ai_providers (
    id uuid default gen_random_uuid() primary key,
    name text unique not null, -- 'gemini', 'openai', 'deepseek'
    api_key text, -- encrypted
    is_active boolean default false not null,
    mode text default 'single' check (mode in ('single', 'parallel')) not null,
    created_at timestamptz default now()
);

-- RLS for ai_providers
alter table ai_providers enable row level security;
create policy "Anyone authenticated can read provider status/mode" on ai_providers for select using (auth.role() = 'authenticated');

-- 8. AI_LOGS TABLE
create table if not exists ai_logs (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references profiles(id) on delete set null,
    provider text not null,
    action text not null,
    prompt_tokens int,
    completion_tokens int,
    cost numeric(10,6),
    status text,
    created_at timestamptz default now()
);

alter table ai_logs enable row level security;
create policy "Users can view own AI logs" on ai_logs for select using (auth.uid() = user_id);

-- 9. EXPORTS TABLE
create table if not exists exports (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references profiles(id) on delete cascade not null,
    filename text not null,
    file_path text not null,
    status text default 'pending' check (status in ('pending', 'completed', 'failed')) not null,
    expires_at timestamptz not null,
    created_at timestamptz default now()
);

alter table exports enable row level security;
create policy "Users can manage own exports" on exports for all using (auth.uid() = user_id);

-- 10. PAYMENTS TABLE
create table if not exists payments (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references profiles(id) on delete cascade not null,
    amount numeric(15,2) not null,
    status text default 'pending' check (status in ('pending', 'approved', 'rejected')) not null,
    method text not null check (method in ('midtrans', 'manual')),
    payment_proof_url text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

alter table payments enable row level security;
create policy "Users can view own payments" on payments for select using (auth.uid() = user_id);
create policy "Users can insert own payments" on payments for insert with check (auth.uid() = user_id);

-- 11. PROCESSED_TELEGRAM_UPDATES TABLE
create table if not exists processed_telegram_updates (
    id bigint primary key,
    processed_at timestamptz default now() not null
);

-- ==========================================
-- AUTOMATION TRIGGER FOR BALANCES AND BUDGETS
-- ==========================================

-- Function to handle wallet balance updates
create or replace function handle_transaction_balance_change()
returns trigger as $$
declare
    t_period text;
begin
    -- 1. REVERT OLD TRANSACTION EFFECTS (if UPDATE or DELETE)
    if (TG_OP = 'DELETE' or TG_OP = 'UPDATE') then
        t_period := to_char(timezone('Asia/Jakarta', old.transaction_date), 'YYYY-MM');
        
        -- Revert Wallet Balance
        if old.type = 'expense' then
            update wallets set balance = balance + old.amount where id = old.wallet_id;
            update budgets set current_spent = current_spent - old.amount 
            where user_id = old.user_id and category_id = old.category_id and period = t_period;
        elsif old.type = 'income' then
            update wallets set balance = balance - old.amount where id = old.wallet_id;
        elsif old.type = 'transfer' then
            update wallets set balance = balance + old.amount where id = old.wallet_id;
            update wallets set balance = balance - old.amount where id = old.transfer_to_wallet_id;
        end if;
    end if;

    -- 2. APPLY NEW TRANSACTION EFFECTS (if INSERT or UPDATE)
    if (TG_OP = 'INSERT' or TG_OP = 'UPDATE') then
        t_period := to_char(timezone('Asia/Jakarta', new.transaction_date), 'YYYY-MM');
        
        -- Apply Wallet Balance
        if new.type = 'expense' then
            update wallets set balance = balance - new.amount where id = new.wallet_id;
            
            -- Update budget spent (insert placeholder row if budget doesn't exist yet but user has category)
            insert into budgets (user_id, category_id, monthly_limit, current_spent, period)
            values (new.user_id, new.category_id, 0.00, new.amount, t_period)
            on conflict (user_id, category_id, period)
            do update set current_spent = budgets.current_spent + new.amount;
        elsif new.type = 'income' then
            update wallets set balance = balance + new.amount where id = new.wallet_id;
        elsif new.type = 'transfer' then
            update wallets set balance = balance - new.amount where id = new.wallet_id;
            update wallets set balance = balance + new.amount where id = new.transfer_to_wallet_id;
        end if;
    end if;

    return new;
end;
$$ language plpgsql security definer;

-- Create Trigger
create or replace trigger sync_transaction_balances
after insert or update or delete on transactions
for each row execute function handle_transaction_balance_change();

-- Seed Default Global Categories
insert into categories (name, emoji, color, type) values
('Makanan', '🍜', '#FF8A00', 'expense'),
('Transport', '🚗', '#00A3FF', 'expense'),
('Hiburan', '🎮', '#9E00FF', 'expense'),
('Tagihan', '🏠', '#FF005C', 'expense'),
('Kesehatan', '💊', '#00E096', 'expense'),
('Belanja', '👕', '#FFB800', 'expense'),
('Pendidikan', '📚', '#00C2FF', 'expense'),
('Gaji', '💼', '#00E047', 'income'),
('Investasi', '📈', '#FF5C00', 'income'),
('Lainnya', '💰', '#7A7A7A', 'expense')
on conflict do nothing;
