-- ClosetSwap initial schema: tables, indexes, triggers, and RLS policies.

create extension if not exists pgcrypto;

create type booking_status as enum (
  'pending',
  'approved',
  'rejected',
  'paid',
  'in_progress',
  'returned'
);

create type user_role as enum ('user', 'admin');

-- =========================================================================
-- profiles
-- =========================================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  avatar_url text,
  bio text,
  role user_role not null default 'user',
  is_blocked boolean not null default false,
  rating_avg numeric(3, 2) not null default 0,
  rating_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Prevent clients from self-granting admin, unblocking themselves, or forging
-- their own rating aggregates through a normal profile-edit update. Only
-- server-side code using the service role key (auth.role() = 'service_role')
-- may change these columns.
create function public.protect_profile_columns()
returns trigger
language plpgsql
as $$
begin
  if auth.role() <> 'service_role' then
    new.role := old.role;
    new.is_blocked := old.is_blocked;
    new.rating_avg := old.rating_avg;
    new.rating_count := old.rating_count;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

alter table public.profiles enable row level security;

create policy "profiles_select_all" on public.profiles
  for select using (true);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- =========================================================================
-- items
-- =========================================================================

create table public.items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '',
  category text not null,
  size text not null,
  price_per_day numeric(10, 2) not null check (price_per_day > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index items_category_active_idx on public.items (category, is_active);
create index items_owner_idx on public.items (owner_id);

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger items_set_updated_at
  before update on public.items
  for each row execute function public.set_updated_at();

alter table public.items enable row level security;

create policy "items_select_active_or_own" on public.items
  for select using (is_active = true or owner_id = auth.uid());

create policy "items_insert_own" on public.items
  for insert with check (
    owner_id = auth.uid()
    and not exists (
      select 1 from public.profiles where id = auth.uid() and is_blocked = true
    )
  );

create policy "items_update_own" on public.items
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "items_delete_own" on public.items
  for delete using (owner_id = auth.uid());

-- =========================================================================
-- item_images
-- =========================================================================

create table public.item_images (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items (id) on delete cascade,
  url text not null,
  sort_order integer not null default 0
);

create index item_images_item_idx on public.item_images (item_id);

alter table public.item_images enable row level security;

create policy "item_images_select" on public.item_images
  for select using (
    exists (
      select 1 from public.items i
      where i.id = item_id and (i.is_active = true or i.owner_id = auth.uid())
    )
  );

create policy "item_images_insert_own" on public.item_images
  for insert with check (
    exists (select 1 from public.items i where i.id = item_id and i.owner_id = auth.uid())
  );

create policy "item_images_delete_own" on public.item_images
  for delete using (
    exists (select 1 from public.items i where i.id = item_id and i.owner_id = auth.uid())
  );

-- =========================================================================
-- bookings
-- =========================================================================

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items (id) on delete cascade,
  renter_id uuid not null references public.profiles (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  status booking_status not null default 'pending',
  total_price numeric(10, 2) not null check (total_price > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index bookings_item_idx on public.bookings (item_id);
create index bookings_renter_idx on public.bookings (renter_id);
create index bookings_owner_idx on public.bookings (owner_id);

create trigger bookings_set_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

alter table public.bookings enable row level security;

create policy "bookings_select_participant" on public.bookings
  for select using (auth.uid() = renter_id or auth.uid() = owner_id);

-- Row-level access only requires "you're a participant"; which transitions
-- are legal for which role is enforced in application code
-- (lib/booking-state-machine.ts), which is easier to unit test than a
-- state machine encoded in SQL policies.
create policy "bookings_insert_renter" on public.bookings
  for insert with check (
    auth.uid() = renter_id
    and renter_id <> owner_id
    and not exists (
      select 1 from public.profiles where id = auth.uid() and is_blocked = true
    )
  );

create policy "bookings_update_participant" on public.bookings
  for update using (auth.uid() = renter_id or auth.uid() = owner_id)
  with check (auth.uid() = renter_id or auth.uid() = owner_id);

-- =========================================================================
-- messages
-- =========================================================================

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index messages_booking_created_idx on public.messages (booking_id, created_at);

alter table public.messages enable row level security;

create policy "messages_select_participant" on public.messages
  for select using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id and (b.renter_id = auth.uid() or b.owner_id = auth.uid())
    )
  );

create policy "messages_insert_participant" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id and (b.renter_id = auth.uid() or b.owner_id = auth.uid())
    )
  );

-- =========================================================================
-- ratings
-- =========================================================================

create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  rater_id uuid not null references public.profiles (id) on delete cascade,
  ratee_id uuid not null references public.profiles (id) on delete cascade,
  score smallint not null check (score between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (booking_id, rater_id)
);

create index ratings_ratee_idx on public.ratings (ratee_id);

create function public.update_profile_rating()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles p
  set rating_count = agg.cnt,
      rating_avg = agg.avg_score
  from (
    select ratee_id, count(*) as cnt, round(avg(score)::numeric, 2) as avg_score
    from public.ratings
    where ratee_id = coalesce(new.ratee_id, old.ratee_id)
    group by ratee_id
  ) agg
  where p.id = agg.ratee_id;
  return coalesce(new, old);
end;
$$;

create trigger on_rating_change
  after insert or update or delete on public.ratings
  for each row execute function public.update_profile_rating();

alter table public.ratings enable row level security;

create policy "ratings_select_all" on public.ratings
  for select using (true);

create policy "ratings_insert_participant" on public.ratings
  for insert with check (
    rater_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and b.status = 'returned'
        and (b.renter_id = auth.uid() or b.owner_id = auth.uid())
        and ratee_id = case when b.renter_id = auth.uid() then b.owner_id else b.renter_id end
    )
  );

-- =========================================================================
-- storage: item-images bucket
-- =========================================================================

insert into storage.buckets (id, name, public)
values ('item-images', 'item-images', true)
on conflict (id) do nothing;

-- Uploaded object paths must be prefixed "<user-id>/...", enforced below so
-- a user can only write/delete inside their own folder.
create policy "item_images_bucket_read" on storage.objects
  for select using (bucket_id = 'item-images');

create policy "item_images_bucket_insert" on storage.objects
  for insert with check (
    bucket_id = 'item-images'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "item_images_bucket_delete" on storage.objects
  for delete using (
    bucket_id = 'item-images'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );
