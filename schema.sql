
-- CLIMA TECH V3 - banco multiusuário com RLS
create extension if not exists pgcrypto;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null default 'Minha Empresa de Climatização',
  cnpj text default '',
  phone text default '',
  email text default '',
  address text default '',
  city text default '',
  logo_data text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text not null default '',
  email text default '',
  address text default '',
  city text default '',
  notes text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.equipment (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  brand text not null,
  model text default '',
  btu text default '',
  type text default 'Split Inverter',
  gas text default '',
  serial text default '',
  location text default '',
  install_date date,
  notes text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  equipment_id uuid references public.equipment(id) on delete set null,
  number text not null,
  date date not null default current_date,
  time text default '',
  status text not null default 'Agendado',
  problem text default '',
  diagnosis text default '',
  solution text default '',
  parts text default '',
  labor numeric(12,2) not null default 0,
  travel numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  notes text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  number text not null,
  date date not null default current_date,
  valid_until date,
  discount numeric(12,2) not null default 0,
  status text not null default 'Aguardando',
  notes text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.quote_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  quote_id uuid not null references public.quotes(id) on delete cascade,
  description text not null,
  type text not null default 'Serviço',
  quantity numeric(12,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists clients_owner_idx on public.clients(owner_id);
create index if not exists equipment_owner_idx on public.equipment(owner_id);
create index if not exists services_owner_idx on public.services(owner_id);
create index if not exists quotes_owner_idx on public.quotes(owner_id);
create index if not exists quote_items_quote_idx on public.quote_items(quote_id);

alter table public.companies enable row level security;
alter table public.clients enable row level security;
alter table public.equipment enable row level security;
alter table public.services enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;

create policy "companies own rows" on public.companies for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "clients own rows" on public.clients for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "equipment own rows" on public.equipment for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "services own rows" on public.services for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "quotes own rows" on public.quotes for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "quote items own rows" on public.quote_items for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create or replace function public.create_company_for_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.companies(owner_id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'company_name', 'Minha Empresa de Climatização'),
    coalesce(new.email, '')
  )
  on conflict (owner_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_clima on auth.users;
create trigger on_auth_user_created_clima
after insert on auth.users
for each row execute procedure public.create_company_for_new_user();

-- Opcional: habilite confirmação de e-mail no Supabase.
-- Para um MVP mais simples, pode desativar a confirmação em Authentication > Providers > Email.
