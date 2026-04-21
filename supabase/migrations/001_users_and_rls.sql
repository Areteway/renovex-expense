-- =============================================
-- Migration 001: Users table + owner_id + RLS
-- =============================================
-- วัตถุประสงค์: แต่ละ Owner (Google OAuth user) เห็นเฉพาะข้อมูลตัวเอง
-- =============================================

-- =============================================
-- 1. USERS TABLE (public profile ลิงก์กับ auth.users)
-- =============================================
create table if not exists public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  avatar_url  text,
  role        text not null default 'admin'
                check (role in ('admin', 'foreman', 'accounting')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger update_users_updated_at
  before update on public.users
  for each row execute function update_updated_at();

-- =============================================
-- 2. AUTO-CREATE USER PROFILE เมื่อ OAuth login ครั้งแรก
--    (ทำงานทุกครั้งที่มี auth.users insert — รวมถึง refresh token)
-- =============================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
    set email      = excluded.email,
        full_name  = excluded.full_name,
        avatar_url = excluded.avatar_url,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================
-- 3. เพิ่ม owner_id ใน projects
--    (FK → auth.users  ไม่ on delete cascade เพื่อความปลอดภัย)
-- =============================================
alter table public.projects
  add column if not exists owner_id uuid references auth.users(id);

-- =============================================
-- 4. RLS — USERS
-- =============================================
alter table public.users enable row level security;

-- เห็นเฉพาะ profile ตัวเอง
create policy "users: select own"
  on public.users for select
  using (id = auth.uid());

-- แก้ไขเฉพาะ profile ตัวเอง
create policy "users: update own"
  on public.users for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- =============================================
-- 5. RLS — PROJECTS
-- =============================================
alter table public.projects enable row level security;

create policy "projects: owner select"
  on public.projects for select
  using (owner_id = auth.uid());

create policy "projects: owner insert"
  on public.projects for insert
  with check (owner_id = auth.uid());

create policy "projects: owner update"
  on public.projects for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "projects: owner delete"
  on public.projects for delete
  using (owner_id = auth.uid());

-- =============================================
-- 6. RLS — TRANSACTIONS (ผ่าน project ownership)
-- =============================================
alter table public.transactions enable row level security;

create policy "transactions: owner select"
  on public.transactions for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = transactions.project_id
        and p.owner_id = auth.uid()
    )
  );

create policy "transactions: owner insert"
  on public.transactions for insert
  with check (
    exists (
      select 1 from public.projects p
      where p.id = transactions.project_id
        and p.owner_id = auth.uid()
    )
  );

create policy "transactions: owner update"
  on public.transactions for update
  using (
    exists (
      select 1 from public.projects p
      where p.id = transactions.project_id
        and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = transactions.project_id
        and p.owner_id = auth.uid()
    )
  );

create policy "transactions: owner delete"
  on public.transactions for delete
  using (
    exists (
      select 1 from public.projects p
      where p.id = transactions.project_id
        and p.owner_id = auth.uid()
    )
  );

-- =============================================
-- 7. RLS — ATTACHMENTS (ผ่าน transaction → project)
-- =============================================
alter table public.attachments enable row level security;

create policy "attachments: owner all"
  on public.attachments for all
  using (
    exists (
      select 1 from public.transactions t
      join public.projects p on p.id = t.project_id
      where t.id = attachments.transaction_id
        and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.transactions t
      join public.projects p on p.id = t.project_id
      where t.id = attachments.transaction_id
        and p.owner_id = auth.uid()
    )
  );

-- =============================================
-- 8. RLS — PROJECT_MEMBERS (ผ่าน project ownership)
--    แทนที่ policy "allow all" เดิม
-- =============================================
drop policy if exists "allow all project_members" on public.project_members;

create policy "project_members: owner all"
  on public.project_members for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_members.project_id
        and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_members.project_id
        and p.owner_id = auth.uid()
    )
  );

-- =============================================
-- 9. STORAGE — attachment bucket RLS
--    (รัน Storage > Policies ใน Supabase Dashboard ด้วย หรือใช้ SQL ด้านล่าง)
-- =============================================
-- insert into storage.buckets (id, name, public) values ('attachment', 'attachment', false)
-- on conflict do nothing;

-- create policy "storage: owner upload"
--   on storage.objects for insert
--   with check (
--     bucket_id = 'attachment'
--     and auth.uid() is not null
--   );
--
-- create policy "storage: owner read"
--   on storage.objects for select
--   using (
--     bucket_id = 'attachment'
--     and auth.uid() is not null
--   );
--
-- create policy "storage: owner delete"
--   on storage.objects for delete
--   using (
--     bucket_id = 'attachment'
--     and auth.uid() is not null
--   );
