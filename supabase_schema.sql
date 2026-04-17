-- Supabase Database Schema for Construct AI

-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- 1. Profiles Table
-- Stores user information derived from auth.users
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  "firstName" text,
  "lastName" text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Users Table
-- Some parts of the code use 'users' table specifically
create table if not exists public.users (
  id uuid references auth.users on delete cascade primary key,
  email text,
  "firstName" text,
  "lastName" text,
  created_at timestamptz default now()
);

-- 3. Chat Sessions Table
-- Stores conversation sessions for each user
create table if not exists public.chat_sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text default 'New Chat',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. Chat Messages Table
-- Stores individual messages within a session
create table if not exists public.chat_messages (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references public.chat_sessions on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  message_type text check (message_type in ('user', 'ai')),
  content text not null,
  citations jsonb, 
  confidence float,
  region text,
  category text,
  created_at timestamptz default now()
);

-- 5. Alerts Table
-- Stores regulation updates for users
create table if not exists public.alerts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  region text,
  category text,
  severity text check (severity in ('high', 'medium', 'low')),
  summary text,
  date timestamptz default now(),
  created_at timestamptz default now()
);

-- RLS POLICIES

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.users enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.alerts enable row level security;

-- Profiles Policies
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Users Policies
create policy "Users can view own user entry" on public.users for select using (auth.uid() = id);
create policy "Users can insert own user entry" on public.users for insert with check (auth.uid() = id);

-- Chat Sessions Policies
create policy "Users can view own sessions" on public.chat_sessions for select using (auth.uid() = user_id);
create policy "Users can insert own sessions" on public.chat_sessions for insert with check (auth.uid() = user_id);
create policy "Users can delete own sessions" on public.chat_sessions for delete using (auth.uid() = user_id);

-- Chat Messages Policies
create policy "Users can view own messages" on public.chat_messages for select using (auth.uid() = user_id);
create policy "Users can insert own messages" on public.chat_messages for insert with check (auth.uid() = user_id);

-- Alerts Policies
create policy "Users can view own alerts" on public.alerts for select using (auth.uid() = user_id);

-- STORAGE BUCKETS
-- Note: Manually create a bucket named 'files' in the Supabase Dashboard.
-- Then run these policies for storage:
/*
-- Allow users to upload files to their own folder
create policy "Users can upload own files"
on storage.objects for insert
with check (
  bucket_id = 'files' AND
  (storage.foldername(name))[1] = 'users' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow users to view their own files
create policy "Users can view own files"
on storage.objects for select
using (
  bucket_id = 'files' AND
  (storage.foldername(name))[1] = 'users' AND
  (storage.foldername(name))[2] = auth.uid()::text
);
*/
