-- Add candidates column to rooms to store fetched restaurants
alter table public.rooms 
add column if not exists candidates jsonb default '[]'::jsonb;

-- Create votes table
create table if not exists public.votes (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references public.rooms(id) on delete cascade not null,
  user_id uuid references public.profiles(id) not null,
  place_id text not null, -- Google Place ID
  vote_type text check (vote_type in ('yes', 'no')) not null,
  created_at timestamp with time zone default now(),
  unique(room_id, user_id, place_id) -- One vote per place per user
);

-- RLS for votes
alter table public.votes enable row level security;

create policy "Votes are viewable by room participants." 
on public.votes for select 
using (
  exists (
    select 1 from public.participants 
    where room_id = public.votes.room_id 
    and user_id = auth.uid()
  )
);

create policy "Users can cast their own votes." 
on public.votes for insert 
with check (
  auth.uid() = user_id 
  and exists (
    select 1 from public.participants 
    where room_id = public.votes.room_id 
    and user_id = auth.uid()
  )
);

-- Realtime for votes
alter publication supabase_realtime add table public.votes;
