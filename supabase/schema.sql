create extension if not exists "pgcrypto";

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  pdf_url text not null,
  created_at timestamp with time zone default now(),
  user_id uuid references auth.users(id)
);

create table if not exists pages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  page_number integer not null,
  scale_factor double precision,
  scale_unit text default 'meters',
  created_at timestamp with time zone default now(),
  unique (project_id, page_number)
);

create table if not exists elements (
  id uuid primary key default gen_random_uuid(),
  page_id uuid references pages(id) on delete cascade,
  type text not null check (type in ('point', 'polyline', 'closed_polyline')),
  points jsonb not null,
  value double precision not null,
  display_order integer not null default 0,
  created_at timestamp with time zone default now()
);

insert into storage.buckets (id, name, public)
values ('pdfs', 'pdfs', true)
on conflict (id) do nothing;
