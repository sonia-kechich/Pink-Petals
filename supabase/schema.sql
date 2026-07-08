-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  Pink Petals — Supabase schema                                         ║
-- ║                                                                        ║
-- ║  Run this once in the Supabase dashboard → SQL Editor → New query.     ║
-- ║  It creates two tables, locks them down with Row-Level Security so     ║
-- ║  each user can only ever touch their own rows, and wires triggers to   ║
-- ║  provision a profile + data document automatically on sign-up.        ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ── Profiles ──────────────────────────────────────────────────────────────
-- One row per user (mirrors auth.users). Holds public-ish profile fields.
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by their owner" on public.profiles;
create policy "Profiles are viewable by their owner"
  on public.profiles for select using (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- ── User data ─────────────────────────────────────────────────────────────
-- A single JSON document per user holding their tasks, habits, notes, focus
-- sessions, settings and ambient-sound prefs. The app already treats its state
-- as one persisted blob (Zustand), so a document model maps cleanly, syncs
-- atomically, and is trivial to evolve. Normalise later if you need querying.
create table if not exists public.user_data (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_data enable row level security;

drop policy if exists "Data is readable by its owner" on public.user_data;
create policy "Data is readable by its owner"
  on public.user_data for select using (auth.uid() = user_id);

drop policy if exists "Owner can insert their data" on public.user_data;
create policy "Owner can insert their data"
  on public.user_data for insert with check (auth.uid() = user_id);

drop policy if exists "Owner can update their data" on public.user_data;
create policy "Owner can update their data"
  on public.user_data for update using (auth.uid() = user_id);

-- ── updated_at touch trigger ────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists user_data_touch_updated_at on public.user_data;
create trigger user_data_touch_updated_at
  before update on public.user_data
  for each row execute function public.touch_updated_at();

-- ── Auto-provision profile + data document on sign-up ───────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'full_name',
      ''
    )
  )
  on conflict (id) do nothing;

  insert into public.user_data (user_id, data)
  values (new.id, '{}'::jsonb)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── OTP codes ───────────────────────────────────────────────────────────────
-- Stores one-time passcodes for email-based sign-in without a password.
-- Codes are short-lived (10 minutes) and marked used after verification.
create table if not exists public.otp_codes (
  id         bigint generated always as identity primary key,
  email      text not null,
  code       text not null,
  expires_at timestamptz not null default now() + interval '10 minutes',
  used       boolean not null default false,
  created_at timestamptz not null default now()
);

-- Generate a random 6-digit OTP, store it, and return it.
-- Call with: select generate_otp('user@example.com');
create or replace function public.generate_otp(p_email text)
returns text language plpgsql security definer as $$
declare
  v_code text;
begin
  v_code := lpad(floor(random() * 1000000)::text, 6, '0');

  insert into public.otp_codes (email, code, expires_at)
  values (p_email, v_code, now() + interval '10 minutes');

  return v_code;
end;
$$;

-- Verify an OTP code for a given email. Returns true if the code is valid
-- and not yet expired. The code is consumed (marked used) on success.
-- Call with: select verify_otp('user@example.com', '481516');
create or replace function public.verify_otp(p_email text, p_code text)
returns boolean language plpgsql security definer as $$
declare
  v_valid boolean;
begin
  update public.otp_codes set used = true
  where email = p_email
    and code = p_code
    and used = false
    and expires_at > now()
  returning true into v_valid;

  return coalesce(v_valid, false);
end;
$$;
