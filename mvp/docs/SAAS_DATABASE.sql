-- Rascunho de arquitetura SaaS (Supabase / PostgreSQL). NÃO aplicado a produção.
-- A implementação da nuvem depende de revisão de segurança, autenticação e migrações.
-- Requer auth.users no Supabase. Política de acesso: membership por tenant.

create extension if not exists pgcrypto;

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now()
);

create table organization_members (
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'supervisor', 'technician')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  external_local_id text,
  code text not null default '',
  name text not null,
  area text not null default '',
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, external_local_id)
);

create table work_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  asset_id uuid,
  title text not null,
  description text not null default '',
  category text not null check (category in ('Lubrificação','Mecânica','Elétrica','Inspeção')),
  priority text not null check (priority in ('Baixa','Média','Alta')),
  recurrence_days integer not null default 0 check (recurrence_days >= 0),
  due_date date not null,
  status text not null default 'pending' check (status in ('pending','completed')),
  assigned_to uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, asset_id) references assets(organization_id, id)
);

create table executions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  order_id uuid not null,
  executed_by uuid references auth.users(id) on delete set null,
  notes text not null default '',
  executed_at timestamptz not null default now(),
  previous_due_date date not null,
  next_due_date date,
  foreign key (organization_id, order_id) references work_orders(organization_id, id) on delete cascade
);

create index idx_org_members_user on organization_members(user_id, organization_id);
create index idx_assets_org on assets(organization_id);
create index idx_orders_org_due on work_orders(organization_id, due_date);
create index idx_executions_org_date on executions(organization_id, executed_at desc);

-- Esse helper evita políticas recursivas sobre a própria tabela de membros.
-- SECURITY DEFINER deve ter search_path fixo. Permissões de execução revisadas antes de deploy.
create function is_org_member(org uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.organization_members om
    where om.organization_id = org and om.user_id = (select auth.uid())
  )
$$;

alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table assets enable row level security;
alter table work_orders enable row level security;
alter table executions enable row level security;

-- Somente leitura para membros autenticados; escritas devem ser feitas por
-- funções SQL/RPC seguras que validem papéis e organização; não abrir INSERT amplo.
create policy org_read on organizations for select to authenticated
  using (public.is_org_member(id));
create policy members_read on organization_members for select to authenticated
  using (public.is_org_member(organization_id));
create policy assets_read on assets for select to authenticated
  using (public.is_org_member(organization_id));
create policy orders_read on work_orders for select to authenticated
  using (public.is_org_member(organization_id));
create policy executions_read on executions for select to authenticated
  using (public.is_org_member(organization_id));

-- Pendente: RPC transacional de criação/convite/edição, políticas de armazenamento
-- de imagens, proteção de funções definer, política de exclusão e logs de auditoria.
