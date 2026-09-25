-- CLIMA TECH V4 - fotos e integração Orçamento -> OS
-- Execute UMA vez no SQL Editor do Supabase.

alter table public.quotes
  add column if not exists equipment_id uuid references public.equipment(id) on delete set null;

alter table public.services
  add column if not exists quote_id uuid references public.quotes(id) on delete set null;

alter table public.services
  add column if not exists parts_total numeric(12,2) not null default 0;

alter table public.services
  add column if not exists discount numeric(12,2) not null default 0;

create index if not exists quotes_equipment_idx on public.quotes(equipment_id);
create index if not exists services_quote_idx on public.services(quote_id);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('equipment','quote','service')),
  entity_id uuid not null,
  storage_path text not null unique,
  caption text not null default '',
  category text not null default 'Geral',
  created_at timestamptz not null default now()
);

create index if not exists photos_owner_entity_idx
  on public.photos(owner_id, entity_type, entity_id);

alter table public.photos enable row level security;

drop policy if exists "photos own rows" on public.photos;
create policy "photos own rows"
on public.photos for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

-- Bucket privado para as fotos do SaaS.
insert into storage.buckets (id, name, public)
values ('clima-photos', 'clima-photos', false)
on conflict (id) do update set public = false;

drop policy if exists "clima photos select" on storage.objects;
drop policy if exists "clima photos insert" on storage.objects;
drop policy if exists "clima photos delete" on storage.objects;

create policy "clima photos select"
on storage.objects for select
to authenticated
using (
  bucket_id = 'clima-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "clima photos insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'clima-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "clima photos delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'clima-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);
