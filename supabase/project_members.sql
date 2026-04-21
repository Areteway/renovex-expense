-- =============================================
-- PROJECT MEMBERS
-- =============================================
create table if not exists project_members (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  role text not null default 'foreman' check (role in ('admin', 'foreman', 'accounting')),
  created_at timestamptz not null default now(),
  unique(project_id, name)
);

create index if not exists idx_project_members_project_id on project_members(project_id);

-- RLS
alter table project_members enable row level security;
create policy "allow all project_members" on project_members for all using (true) with check (true);
