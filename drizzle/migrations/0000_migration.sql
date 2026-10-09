
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  hobbies text,
  interests text,
  ai_uses text,
  onboarded boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile" on public.profiles for all to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create table public.user_settings (
  user_id uuid primary key,
  font text not null default 'claude',
  palette text not null default 'violet',
  custom_color text,
  theme text not null default 'system',
  wake_word boolean not null default false,
  read_aloud boolean not null default false,
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.user_settings to authenticated;
grant all on public.user_settings to service_role;
alter table public.user_settings enable row level security;
create policy "own settings" on public.user_settings for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  description text not null default '',
  instructions text not null default '',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.projects to authenticated;
grant all on public.projects to service_role;
alter table public.projects enable row level security;
create policy "own projects" on public.projects for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  path text not null,
  content text not null default '',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.project_files to authenticated;
grant all on public.project_files to service_role;
alter table public.project_files enable row level security;
create policy "own project files" on public.project_files for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  title text not null default 'New chat',
  mode text not null default 'chat',
  pinned boolean not null default false,
  project_id uuid references public.projects(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.conversations to authenticated;
grant all on public.conversations to service_role;
alter table public.conversations enable row level security;
create policy "own conversations" on public.conversations for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  role text not null,
  content text not null default '',
  sources jsonb,
  attachments jsonb,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;
create policy "own messages" on public.messages for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index on public.messages(conversation_id, created_at);

create table public.memory_facts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  fact text not null,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.memory_facts to authenticated;
grant all on public.memory_facts to service_role;
alter table public.memory_facts enable row level security;
create policy "own facts" on public.memory_facts for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name) values (new.id, split_part(new.email, '@', 1)) on conflict do nothing;
  insert into public.user_settings (user_id) values (new.id) on conflict do nothing;
  return new;
end; $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
