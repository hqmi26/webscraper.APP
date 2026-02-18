-- Create profiles table
create table public.profiles (
  id uuid references auth.users not null primary key,
  is_pro boolean default false,
  stripe_customer_id text,
  updated_at timestamp with time zone,
  username text,
  avatar_url text,
  constraint username_length check (char_length(username) >= 3)
);

-- Create rooms table
create table public.rooms (
  id uuid default gen_random_uuid() primary key,
  room_code text unique not null,
  host_id uuid references public.profiles(id) not null,
  status text check (status in ('waiting', 'voting', 'ended')) default 'waiting',
  location_coords jsonb, -- Store as {lat: number, lng: number}
  created_at timestamp with time zone default now()
);

-- Create participants table
create table public.participants (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references public.rooms(id) on delete cascade not null,
  user_id uuid references public.profiles(id) not null,
  cravings text[],
  vote_status text default 'pending',
  joined_at timestamp with time zone default now(),
  unique(room_id, user_id)
);

-- Create dining_history table
create table public.dining_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  cuisine text not null,
  restaurant_name text,
  eaten_at timestamp with time zone default now()
);

-- Set up Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.participants enable row level security;
alter table public.dining_history enable row level security;

-- Create policies (examples, can be refined)
create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);
create policy "Users can insert their own profile." on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on public.profiles for update using (auth.uid() = id);

create policy "Rooms are viewable by participants." on public.rooms for select using (true); -- Simplified for now
create policy "Authenticated users can create rooms." on public.rooms for insert with check (auth.role() = 'authenticated');

create policy "Participants viewable by room members." on public.participants for select using (true);
create policy "Users can join rooms." on public.participants for insert with check (auth.uid() = user_id);

create policy "Users can view own dining history." on public.dining_history for select using (auth.uid() = user_id);
create policy "Users can insert own dining history." on public.dining_history for insert with check (auth.uid() = user_id);

-- Realtime subscriptions
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.participants;
