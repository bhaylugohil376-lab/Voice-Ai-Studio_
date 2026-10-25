-- VoiceAI Supabase profile bootstrap
-- Run in Supabase Dashboard -> SQL Editor before enabling account/profile APIs. Safe to re-run.
create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade, full_name text, avatar_url text,
 plan text not null default 'free', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
revoke all on public.profiles from anon,authenticated;
grant select on public.profiles to authenticated;
grant all on public.profiles to service_role;
drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile" on public.profiles for select to authenticated using ((select auth.uid())=id);
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,full_name,plan) values(new.id,nullif(trim(new.raw_user_meta_data->>'full_name'),''),'free') on conflict(id) do nothing;
 return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
-- The browser must never receive or use the service-role key.
