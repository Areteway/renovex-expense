-- =============================================
-- Renovation Expense Control System - Schema
-- =============================================
-- หมายเหตุ: Migration จริงอยู่ใน supabase/migrations/
--   001_users_and_rls.sql — users table + owner_id + RLS
-- =============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =============================================
-- USERS (public profile linked to auth.users)
-- =============================================
-- create table if not exists public.users (
--   id         uuid primary key references auth.users(id) on delete cascade,
--   email      text not null,
--   full_name  text,
--   avatar_url text,
--   role       text not null default 'admin' check (role in ('admin', 'foreman', 'accounting')),
--   created_at timestamptz not null default now(),
--   updated_at timestamptz not null default now()
-- );
-- ดู migrations/001_users_and_rls.sql สำหรับ full setup

-- =============================================
-- PROJECTS
-- =============================================
create table if not exists projects (
  id uuid primary key default uuid_generate_v4(),
  project_name text not null,
  budget_total numeric(15,2) not null default 0,
  area numeric(10,2),
  target_sell_price numeric(15,2),
  status text not null default 'active' check (status in ('active', 'completed', 'paused')),
  owner_id uuid references auth.users(id),  -- เจ้าของโปรเจกต์ (Google OAuth user)
  created_by text not null default 'admin',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =============================================
-- TRANSACTIONS
-- =============================================
create table if not exists transactions (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  date date not null default current_date,
  category text not null,
  description text not null,
  amount numeric(15,2) not null,
  type text not null default 'expense' check (type in ('expense', 'income')),
  payment_method text not null check (payment_method in ('โอนเงิน', 'เงินสด', 'บัตร', 'ค้างจ่าย')),
  status text not null default 'paid' check (status in ('paid', 'unpaid', 'deposit')),
  payee text,
  created_by text not null default 'admin',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =============================================
-- ATTACHMENTS
-- =============================================
create table if not exists attachments (
  id uuid primary key default uuid_generate_v4(),
  transaction_id uuid not null references transactions(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  file_type text not null check (file_type in ('slip', 'invoice', 'photo', 'other')),
  storage_path text not null,
  created_at timestamptz not null default now()
);

-- =============================================
-- INDEXES
-- =============================================
create index if not exists idx_transactions_project_id on transactions(project_id);
create index if not exists idx_transactions_date on transactions(date);
create index if not exists idx_transactions_category on transactions(category);
create index if not exists idx_transactions_status on transactions(status);
create index if not exists idx_attachments_transaction_id on attachments(transaction_id);

-- =============================================
-- UPDATED_AT TRIGGER
-- =============================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_projects_updated_at
  before update on projects
  for each row execute function update_updated_at();

create trigger update_transactions_updated_at
  before update on transactions
  for each row execute function update_updated_at();

-- =============================================
-- STORAGE BUCKET
-- =============================================
-- Run in Supabase Dashboard > Storage > New Bucket
-- Bucket name: "attachment"
-- Public: false

-- =============================================
-- SEED DATA (optional - for testing)
-- =============================================
insert into projects (project_name, budget_total, area, target_sell_price, created_by) values
  ('บ้านรีโนเวทสุขุมวิท 71', 1500000, 120, 4500000, 'admin'),
  ('คอนโดลาดพร้าว 80', 800000, 65, 3200000, 'admin')
on conflict do nothing;
