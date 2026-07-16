-- ============================================================
-- TSF Tracker — AUTH & ROLES  (run AFTER supabase_full_schema.sql)
-- Roles: admin / central_entry / plant_entry / viewer
-- Login: email + password (enable in Supabase Auth settings)
-- ============================================================

-- ---------- profiles: one row per auth user, carries role ----------
create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  role       text not null default 'viewer'
             check (role in ('admin','central_entry','plant_entry','viewer')),
  plant_id   uuid references plants(id),   -- set only for plant_entry
  active     boolean default true,
  created_at timestamptz default now()
);

-- auto-create a profile row when a new auth user is created (defaults to viewer)
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'viewer')
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- helper functions to read current user's role ----------
create or replace function current_role_name()
returns text language sql stable as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function is_admin()
returns boolean language sql stable as $$
  select exists(select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function can_write()
returns boolean language sql stable as $$
  select exists(select 1 from profiles where id = auth.uid()
                and role in ('admin','central_entry','plant_entry'));
$$;

-- ============================================================
-- RLS: turn on and apply policies
-- Pattern for this phase:
--   * everyone authenticated can READ
--   * writers (admin/central/plant) can INSERT/UPDATE operational tables
--   * only admin can write REFERENCE tables + profiles
-- Plant-row scoping for plant_entry is activated in the production slice.
-- ============================================================

-- profiles: user sees own; admin sees/manages all
alter table profiles enable row level security;
drop policy if exists p_profiles_self_read on profiles;
create policy p_profiles_self_read on profiles for select
  using (id = auth.uid() or is_admin());
drop policy if exists p_profiles_admin_write on profiles;
create policy p_profiles_admin_write on profiles for all
  using (is_admin()) with check (is_admin());

-- reference tables: read = any authed; write = admin only
do $$
declare t text;
begin
  foreach t in array array[
    'product_types','wholecrab_grades','meat_grades','suppliers',
    'customers','plants','document_types'
  ] loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists %I on %I;', 'p_'||t||'_read', t);
    execute format('create policy %I on %I for select using (auth.uid() is not null);',
                   'p_'||t||'_read', t);
    execute format('drop policy if exists %I on %I;', 'p_'||t||'_write', t);
    execute format('create policy %I on %I for all using (is_admin()) with check (is_admin());',
                   'p_'||t||'_write', t);
  end loop;
end $$;

-- operational tables: read = any authed; write = can_write()
do $$
declare t text;
begin
  foreach t in array array[
    'consignments','consignment_contents','consignment_documents',
    'batches','stock_movements',
    'production_issues','production_issue_batches','meat_output',
    'meat_transfers','orders','packing_runs','fg_movements'
  ] loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists %I on %I;', 'p_'||t||'_read', t);
    execute format('create policy %I on %I for select using (auth.uid() is not null);',
                   'p_'||t||'_read', t);
    execute format('drop policy if exists %I on %I;', 'p_'||t||'_write', t);
    execute format('create policy %I on %I for all using (can_write()) with check (can_write());',
                   'p_'||t||'_write', t);
  end loop;
end $$;

-- ============================================================
-- FIRST ADMIN SETUP (manual, as you chose):
--   1. Supabase -> Authentication -> Users -> Add user
--      (create your email + password)
--   2. Then run, replacing the email:
--        update profiles set role='admin', full_name='Viraj'
--        where id = (select id from auth.users where email='YOU@EXAMPLE.COM');
--   3. Verify: select role from profiles where id = auth.uid();  -- after login
-- ============================================================
