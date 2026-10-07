-- Migration for mencatat.id Fintech SaaS Schema
-- Drop types if exist
CREATE TYPE user_plan AS ENUM ('starter', 'pro');
CREATE TYPE user_role AS ENUM ('user', 'admin');
CREATE TYPE account_approval_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE telegram_status AS ENUM ('disconnected', 'testing', 'connected');
CREATE TYPE transaction_type AS ENUM ('income', 'expense', 'transfer');
CREATE TYPE transaction_source AS ENUM ('web', 'telegram_text', 'telegram_receipt');
CREATE TYPE payment_status AS ENUM ('pending', 'settlement', 'approved', 'rejected', 'failed', 'expire');

-- Profiles / User Metadata Table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    phone_number TEXT UNIQUE,
    phone_verified BOOLEAN DEFAULT TRUE NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    plan user_plan DEFAULT 'starter' NOT NULL,
    role user_role DEFAULT 'user' NOT NULL,
    account_status account_approval_status DEFAULT 'pending' NOT NULL,
    telegram_bot_token TEXT,
    telegram_chat_id BIGINT UNIQUE,
    telegram_username TEXT,
    telegram_connection_status telegram_status DEFAULT 'disconnected' NOT NULL,
    google_sheet_id TEXT,
    google_sheet_url TEXT,
    default_wallet_id UUID,
    default_currency TEXT DEFAULT 'IDR' NOT NULL,
    reminder_enabled BOOLEAN DEFAULT TRUE NOT NULL,
    reminder_frequency INT DEFAULT 1 NOT NULL,
    reminder_times TEXT[] DEFAULT ARRAY['20:00']::TEXT[],
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Jakarta', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Jakarta', NOW()) NOT NULL
);

-- Wallets Table
CREATE TABLE public.wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    balance NUMERIC(15, 2) DEFAULT 0 NOT NULL,
    is_default BOOLEAN DEFAULT FALSE NOT NULL,
    color TEXT DEFAULT '#10b981' NOT NULL,
    icon TEXT DEFAULT 'wallet' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Jakarta', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Jakarta', NOW()) NOT NULL
);

-- Categories Table
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    emoji TEXT DEFAULT '📁' NOT NULL,
    color TEXT DEFAULT '#10b981' NOT NULL,
    type transaction_type NOT NULL,
    monthly_budget NUMERIC(15, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Jakarta', NOW()) NOT NULL
);

-- Transactions Table
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
    to_wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    type transaction_type NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    notes TEXT,
    transaction_date TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Jakarta', NOW()) NOT NULL,
    source transaction_source DEFAULT 'web' NOT NULL,
    receipt_url TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Jakarta', NOW()) NOT NULL
);

-- Telegram Webhook Idempotency Table
CREATE TABLE public.telegram_processed_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    update_id BIGINT UNIQUE NOT NULL,
    processed_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Jakarta', NOW()) NOT NULL
);

-- AI Configuration Table (Admin managed)
CREATE TABLE public.ai_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    api_key_encrypted TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    priority INT DEFAULT 1 NOT NULL,
    mode TEXT DEFAULT 'single' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Jakarta', NOW()) NOT NULL
);

-- AI Call Logs
CREATE TABLE public.ai_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    provider TEXT NOT NULL,
    prompt_tokens INT DEFAULT 0,
    completion_tokens INT DEFAULT 0,
    status TEXT NOT NULL,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Jakarta', NOW()) NOT NULL
);

-- Payments Table
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    order_id TEXT UNIQUE NOT NULL,
    gross_amount NUMERIC(15, 2) NOT NULL,
    plan user_plan NOT NULL,
    payment_type TEXT DEFAULT 'midtrans' NOT NULL,
    status payment_status DEFAULT 'pending' NOT NULL,
    proof_image_url TEXT,
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Jakarta', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Jakarta', NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles self access" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Admin access profiles" ON public.profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Wallets self access" ON public.wallets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Categories self access" ON public.categories FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Transactions self access" ON public.transactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admin access transactions" ON public.transactions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Payments self access" ON public.payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin access payments" ON public.payments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
