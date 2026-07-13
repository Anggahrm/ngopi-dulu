-- ═══════════════════════════════════════════
-- Ngopi Dulu — Supabase Schema
-- Coffee shop ordering platform
-- ═══════════════════════════════════════════

-- 1. PROFILES
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text unique not null,
  full_name  text,
  avatar_url text,
  role       text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. PRODUCTS (menu items)
create table public.products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  price       int not null check (price > 0), -- in IDR (e.g. 28000 = Rp28.000)
  category    text not null check (category in ('coffee','non-coffee','food','pastry')),
  image_url   text,
  available   boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger products_updated_at
  before update on public.products
  for each row execute procedure update_updated_at();

-- 3. ORDERS
create table public.orders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  status      text not null default 'pending' check (status in ('pending','confirmed','preparing','ready','completed','cancelled')),
  total       int not null default 0,
  note        text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create trigger orders_updated_at
  before update on public.orders
  for each row execute procedure update_updated_at();

-- 4. ORDER ITEMS
create table public.order_items (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity   int not null default 1 check (quantity > 0),
  price      int not null -- snapshot harga saat order
);

-- 5. RLS
alter table public.profiles    enable row level security;
alter table public.products    enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

-- Profiles
create policy "profiles_select_all" on public.profiles for select using (true);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "profiles_update_admin" on public.profiles for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Products: anyone can read, admin can CRUD
create policy "products_select_all" on public.products for select using (true);
create policy "products_insert_admin" on public.products for insert with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "products_update_admin" on public.products for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "products_delete_admin" on public.products for delete using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Orders: user sees own orders, admin sees all
create policy "orders_select_own" on public.orders for select using (auth.uid() = user_id);
create policy "orders_select_admin" on public.orders for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "orders_insert_own" on public.orders for insert with check (auth.uid() = user_id);
create policy "orders_update_admin" on public.orders for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Order items: linked to order owner or admin
create policy "order_items_select_own" on public.order_items for select using (
  exists (select 1 from public.orders where id = order_id and user_id = auth.uid())
);
create policy "order_items_select_admin" on public.order_items for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "order_items_insert_own" on public.order_items for insert with check (
  exists (select 1 from public.orders where id = order_id and user_id = auth.uid())
);

-- 6. STORAGE
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true) on conflict do nothing;
create policy "product_images_upload" on storage.objects
  for insert with check (bucket_id = 'product-images' and auth.role() = 'authenticated');
create policy "product_images_public_read" on storage.objects
  for select using (bucket_id = 'product-images');
