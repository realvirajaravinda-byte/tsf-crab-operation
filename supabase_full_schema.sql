-- ============================================================
-- TSF Import → Production → FG Tracker — FULL ENTERPRISE SCHEMA
-- Chain: consignment → GRN batch → production issue (plant, pooled)
--        → meat output (recovery) → meat transfer (QC) → packing → FG
-- Full traceability: FG → container.
-- Run in Supabase SQL Editor. Safe to re-run.
-- ============================================================

-- ============================================================
-- SECTION 1 — REFERENCE TABLES
-- ============================================================

create table if not exists product_types (
  code       text primary key,
  name       text not null,
  sort_order int default 0
);
insert into product_types (code, name, sort_order) values
  ('cal','Callinectes',1),('por','Portunus',2),('cm','Crab Meat',3)
on conflict (code) do nothing;

-- whole-crab grades (grading of incoming raw material)
create table if not exists wholecrab_grades (
  id         uuid primary key default gen_random_uuid(),
  code       text unique not null,
  name       text not null,
  active     boolean default true,
  sort_order int default 0
);

-- meat grades (output of processing: jumbo, lump, claw, etc.)
create table if not exists meat_grades (
  id         uuid primary key default gen_random_uuid(),
  code       text unique not null,
  name       text not null,
  active     boolean default true,
  sort_order int default 0
);
insert into meat_grades (code, name, sort_order) values
  ('JUMBO','Jumbo Lump',1),('LUMP','Lump',2),('BACKFIN','Backfin',3),
  ('SPECIAL','Special',4),('CLAW','Claw Meat',5)
on conflict (code) do nothing;

create table if not exists suppliers (
  id       uuid primary key default gen_random_uuid(),
  name     text unique not null,
  country  text,
  active   boolean default true
);
insert into suppliers (name, country) values
  ('Granchio Blu', null),('MWF - Tunisia','Tunisia'),
  ('Seaside - Bahrain','Bahrain'),('Seafood Express', null),
  ('Central Seafood', null)
on conflict (name) do nothing;

create table if not exists customers (
  id     uuid primary key default gen_random_uuid(),
  name   text unique not null,
  active boolean default true
);

-- mini plants M01–M12 with zone + region
create table if not exists plants (
  id       uuid primary key default gen_random_uuid(),
  code     text unique not null,          -- M01..M12
  name     text,
  zone     text,                          -- MAN / JAF / A32 / KAL
  region   text,                          -- Kilinochchi / Jaffna / Mannar
  active   boolean default true
);
insert into plants (code, zone, region) values
  ('M01','JAF','Jaffna'),('M02','JAF','Jaffna'),('M03','A32','Kilinochchi'),
  ('M04','A32','Kilinochchi'),('M05','KAL','Kilinochchi'),('M06','KAL','Kilinochchi'),
  ('M07','MAN','Mannar'),('M08','MAN','Mannar'),('M09','JAF','Jaffna'),
  ('M10','A32','Kilinochchi'),('M11','KAL','Kilinochchi'),('M12','MAN','Mannar')
on conflict (code) do nothing;
-- NOTE: zone/region above are placeholders — correct them in-app to match your real mapping.

create table if not exists document_types (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  authority     text,
  source        text,
  needed_before text,
  active        boolean default true,
  sort_order    int default 0
);
insert into document_types (name, authority, source, needed_before, sort_order)
select v.name, v.authority, v.source, v.needed_before, v.sort_order
from (values
  ('Commercial Invoice','Customs','Supplier','Arrival',1),
  ('Packing List','Customs','Supplier','Arrival',2),
  ('Bill of Lading','Customs','Supplier/Line','Arrival',3),
  ('Certificate of Origin','Customs','Supplier','Arrival',4),
  ('Insurance Certificate','Customs','TSF','Arrival',5),
  ('Customs Declaration (CusDec)','Customs','TSF/Broker','Clearance',6),
  ('Catch Certificate','Fisheries','Supplier','Arrival',7),
  ('Health Certificate (origin)','Fisheries','Supplier','Arrival',8),
  ('Fisheries Import Permit','Fisheries','TSF','Arrival',9),
  ('Analysis / Quality Certificate','Fisheries','Supplier','Arrival',10)
) as v(name,authority,source,needed_before,sort_order)
where not exists (select 1 from document_types dt where dt.name = v.name);

-- ============================================================
-- SECTION 2 — IMPORT (consignments + contents + documents)
-- ============================================================

create table if not exists consignments (
  id                uuid primary key default gen_random_uuid(),
  supplier          text not null,
  product_code      text references product_types(code),   -- headline only, nullable
  po_value          numeric,
  invoice_number    text,
  invoice_qty_kg    numeric,
  shipping_line     text,
  container_number  text,
  status            text not null default 'supplier_production',
  -- supplier_production -> waiting_advance -> on_the_way -> under_clearance -> received -> unloaded
  etd               date,
  original_eta      date,
  new_eta           date,
  received_date     date,
  unload_complete   date,
  unload_place      text,
  remarks           text,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);
create index if not exists idx_consignments_status  on consignments(status);

create table if not exists consignment_contents (
  id              uuid primary key default gen_random_uuid(),
  consignment_id  uuid not null references consignments(id) on delete cascade,
  product_code    text references product_types(code),
  grade           text,
  declared_qty_kg numeric,
  remarks         text,
  created_at      timestamptz default now()
);
create index if not exists idx_contents_consignment on consignment_contents(consignment_id);

create table if not exists consignment_documents (
  id               uuid primary key default gen_random_uuid(),
  consignment_id   uuid not null references consignments(id) on delete cascade,
  document_type_id uuid references document_types(id),
  doc_name         text,
  authority        text,
  status           text not null default 'pending'
                   check (status in ('pending','submitted','approved')),
  submitted_date   date,
  approved_date    date,
  remarks          text,
  created_at       timestamptz default now()
);
create index if not exists idx_docs_consignment on consignment_documents(consignment_id);

-- ============================================================
-- SECTION 3 — WHOLE-CRAB WAREHOUSE (batches + stock ledger)
-- ============================================================

create table if not exists batches (
  id              uuid primary key default gen_random_uuid(),
  batch_number    text unique not null,          -- Ical26071601
  consignment_id  uuid references consignments(id),
  product_code    text references product_types(code),
  grade           text,                          -- whole-crab grade (nullable)
  grn_date        date not null,
  qty_received_kg numeric not null,
  remarks         text,
  created_at      timestamptz default now()
);
create index if not exists idx_batches_consignment on batches(consignment_id);

create table if not exists stock_movements (
  id            uuid primary key default gen_random_uuid(),
  batch_id      uuid not null references batches(id),
  movement_type text not null check (movement_type in ('IN','OUT')),
  qty_kg        numeric not null check (qty_kg > 0),
  movement_date date not null default current_date,
  reference     text,                            -- production issue ref for OUT
  remarks       text,
  created_at    timestamptz default now()
);
create index if not exists idx_movements_batch on stock_movements(batch_id);

-- ============================================================
-- SECTION 4 — PRODUCTION (plant-level issues, pooled batches, meat output)
-- ============================================================

create table if not exists production_issues (
  id             uuid primary key default gen_random_uuid(),
  issue_ref      text unique not null,           -- F26071601
  plant_id       uuid references plants(id),
  issue_date     date not null,
  wholecrab_in_kg numeric default 0,             -- total pooled whole crab consumed
  remarks        text,
  created_at     timestamptz default now()
);
create index if not exists idx_prodissue_plant on production_issues(plant_id);
create index if not exists idx_prodissue_date  on production_issues(issue_date);

-- LINK: which GRN batches fed this issue, and how much from each (many-to-many)
create table if not exists production_issue_batches (
  id                 uuid primary key default gen_random_uuid(),
  production_issue_id uuid not null references production_issues(id) on delete cascade,
  batch_id           uuid not null references batches(id),
  qty_kg             numeric not null check (qty_kg > 0),
  created_at         timestamptz default now()
);
create index if not exists idx_pib_issue on production_issue_batches(production_issue_id);
create index if not exists idx_pib_batch on production_issue_batches(batch_id);

-- meat produced by an issue, per meat grade (drives recovery)
create table if not exists meat_output (
  id                 uuid primary key default gen_random_uuid(),
  production_issue_id uuid not null references production_issues(id) on delete cascade,
  meat_grade_id      uuid references meat_grades(id),
  qty_kg             numeric not null check (qty_kg >= 0),
  created_at         timestamptz default now()
);
create index if not exists idx_meatout_issue on meat_output(production_issue_id);

-- ============================================================
-- SECTION 5 — MEAT WIP → PACKING (transfers, may lag output)
-- ============================================================

create table if not exists meat_transfers (
  id             uuid primary key default gen_random_uuid(),
  transfer_date  date not null default current_date,
  production_issue_id uuid references production_issues(id),  -- trace back to source
  meat_grade_id  uuid references meat_grades(id),
  qty_kg         numeric not null check (qty_kg > 0),
  remarks        text,
  created_at     timestamptz default now()
);
create index if not exists idx_meattrans_issue on meat_transfers(production_issue_id);

-- ============================================================
-- SECTION 6 — ORDERS, PACKING, FINISHED GOODS
-- ============================================================

create table if not exists orders (
  id           uuid primary key default gen_random_uuid(),
  order_ref    text,
  customer_id  uuid references customers(id),
  product_code text references product_types(code),
  meat_grade_id uuid references meat_grades(id),
  qty_required_kg numeric,
  due_date     date,
  status       text default 'open' check (status in ('open','part','closed','cancelled')),
  remarks      text,
  created_at   timestamptz default now()
);
create index if not exists idx_orders_status on orders(status);

create table if not exists packing_runs (
  id            uuid primary key default gen_random_uuid(),
  pack_date     date not null default current_date,
  order_id      uuid references orders(id),
  meat_grade_id uuid references meat_grades(id),
  meat_consumed_kg numeric not null check (meat_consumed_kg >= 0),
  fg_produced_kg   numeric not null check (fg_produced_kg >= 0),
  pack_format   text,
  remarks       text,
  created_at    timestamptz default now()
);
create index if not exists idx_packing_order on packing_runs(order_id);

create table if not exists fg_movements (
  id            uuid primary key default gen_random_uuid(),
  movement_type text not null check (movement_type in ('IN','OUT')),
  packing_run_id uuid references packing_runs(id),   -- for IN, trace to pack
  order_id      uuid references orders(id),          -- for OUT, delivery to order
  product_code  text references product_types(code),
  meat_grade_id uuid references meat_grades(id),
  qty_kg        numeric not null check (qty_kg > 0),
  movement_date date not null default current_date,
  reference     text,
  remarks       text,
  created_at    timestamptz default now()
);
create index if not exists idx_fgmove_order on fg_movements(order_id);

-- ============================================================
-- SECTION 6B — LOCAL / LIVE PIPELINE (parallel inbound, shares plants + FG)
-- ============================================================

-- cooking stations
create table if not exists cooking_stations (
  id     uuid primary key default gen_random_uuid(),
  code   text unique not null,
  name   text,
  active boolean default true
);

-- 1. purchase live crab at CS
create table if not exists local_purchases (
  id             uuid primary key default gen_random_uuid(),
  purchase_ref   text unique,
  cs_id          uuid references cooking_stations(id),
  supplier       text,
  crab_size      text,                          -- size grade of live crab
  qty_kg         numeric,                       -- live weight purchased
  purchase_date  date not null default current_date,
  remarks        text,
  created_at     timestamptz default now()
);

-- 2. cook & dispatch from CS
create table if not exists local_cook_dispatch (
  id             uuid primary key default gen_random_uuid(),
  local_purchase_id uuid references local_purchases(id),
  cooked_weight_kg numeric,
  lorry_number   text,
  dispatch_date  date,
  remarks        text,
  created_at     timestamptz default now()
);

-- 3. arrive at Main MP (main mini plant / hub)
create table if not exists local_mp_receipts (
  id             uuid primary key default gen_random_uuid(),
  receipt_ref    text unique,                   -- acts as the local "batch"
  local_cook_dispatch_id uuid references local_cook_dispatch(id),
  received_weight_kg numeric,
  receipt_date   date not null default current_date,
  remarks        text,
  created_at     timestamptz default now()
);

-- 4. share out to mini plants (one receipt may split across plants)
create table if not exists local_plant_distributions (
  id              uuid primary key default gen_random_uuid(),
  local_mp_receipt_id uuid not null references local_mp_receipts(id) on delete cascade,
  plant_id        uuid references plants(id),
  lorry_number    text,
  qty_kg          numeric not null check (qty_kg > 0),
  dist_date       date not null default current_date,
  created_at      timestamptz default now()
);
create index if not exists idx_localdist_receipt on local_plant_distributions(local_mp_receipt_id);
create index if not exists idx_localdist_plant on local_plant_distributions(plant_id);

-- 5. pick meat into keeping cases (per plant)
create table if not exists keeping_cases (
  id              uuid primary key default gen_random_uuid(),
  case_ref        text,
  local_plant_distribution_id uuid references local_plant_distributions(id),
  plant_id        uuid references plants(id),
  meat_grade_id   uuid references meat_grades(id),
  picker          text,
  qty_kg          numeric not null check (qty_kg >= 0),
  pick_date       date not null default current_date,
  created_at      timestamptz default now()
);
create index if not exists idx_keepingcase_dist on keeping_cases(local_plant_distribution_id);

-- 6. pack keeping cases into meat boxes
create table if not exists meat_boxes (
  id              uuid primary key default gen_random_uuid(),
  box_number      text,
  plant_id        uuid references plants(id),
  meat_grade_id   uuid references meat_grades(id),
  qty_kg          numeric not null check (qty_kg >= 0),
  pack_date       date not null default current_date,
  returned_to_mp  boolean default false,        -- step 7: returned to Main MP
  return_date     date,
  return_lorry    text,
  created_at      timestamptz default now()
);
create index if not exists idx_meatbox_plant on meat_boxes(plant_id);

-- link keeping cases -> meat boxes (a box holds several cases)
create table if not exists meat_box_cases (
  id             uuid primary key default gen_random_uuid(),
  meat_box_id    uuid not null references meat_boxes(id) on delete cascade,
  keeping_case_id uuid not null references keeping_cases(id),
  created_at     timestamptz default now()
);
create index if not exists idx_mbc_box on meat_box_cases(meat_box_id);

-- NOTE: from packing onward (step 8-10) the LOCAL stream reuses the SHARED
-- tables: packing_runs -> fg_movements. Packing batch links to meat_boxes
-- via a nullable source. A `source_stream` tag on packing_runs/meat flows
-- ('import' | 'local') keeps recovery + FG reporting separable.
alter table packing_runs add column if not exists source_stream text default 'import'
  check (source_stream in ('import','local'));
alter table meat_output add column if not exists source_stream text default 'import'
  check (source_stream in ('import','local'));

-- ============================================================
-- SECTION 7 — FUNCTIONS
-- ============================================================

-- next GRN batch number: I + product + YYMMDD + NN
create or replace function next_batch_number(p_product text, p_date date)
returns text language plpgsql as $$
declare seq int; datepart text := to_char(p_date,'YYMMDD');
begin
  select count(*)+1 into seq from batches
   where product_code = p_product and grn_date = p_date;
  return 'I' || p_product || datepart || lpad(seq::text,2,'0');
end; $$;

-- next production issue ref: F + YYMMDD + NN
create or replace function next_issue_ref(p_date date)
returns text language plpgsql as $$
declare seq int; datepart text := to_char(p_date,'YYMMDD');
begin
  select count(*)+1 into seq from production_issues where issue_date = p_date;
  return 'F' || datepart || lpad(seq::text,2,'0');
end; $$;

-- seed a consignment's document checklist from active document_types
create or replace function seed_consignment_documents(p_consignment uuid)
returns void language plpgsql as $$
begin
  insert into consignment_documents (consignment_id, document_type_id, doc_name, authority)
  select p_consignment, dt.id, dt.name, dt.authority
  from document_types dt
  where dt.active = true
    and not exists (select 1 from consignment_documents cd
      where cd.consignment_id = p_consignment and cd.document_type_id = dt.id);
end; $$;

-- ============================================================
-- SECTION 8 — TRIGGERS
-- ============================================================

create or replace function trg_seed_docs() returns trigger language plpgsql as $$
begin perform seed_consignment_documents(new.id); return new; end; $$;
drop trigger if exists trg_consignment_seed_docs on consignments;
create trigger trg_consignment_seed_docs
  after insert on consignments for each row execute function trg_seed_docs();

create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;
drop trigger if exists trg_consignments_touch on consignments;
create trigger trg_consignments_touch
  before update on consignments for each row execute function touch_updated_at();

-- ============================================================
-- SECTION 9 — VIEWS (balances, recovery, dashboard feeds)
-- ============================================================

-- whole-crab batch balance
create or replace view v_batch_balance as
select b.id as batch_id, b.batch_number, b.consignment_id, b.product_code, b.grade,
       b.grn_date, b.qty_received_kg,
       coalesce(sum(case when m.movement_type='IN'  then m.qty_kg end),0) as total_in,
       coalesce(sum(case when m.movement_type='OUT' then m.qty_kg end),0) as total_out,
       coalesce(sum(case when m.movement_type='IN'  then m.qty_kg end),0)
       - coalesce(sum(case when m.movement_type='OUT' then m.qty_kg end),0) as balance_kg
from batches b left join stock_movements m on m.batch_id=b.id
group by b.id;

-- whole-crab stock rolled up by product + grade
create or replace view v_stock_by_product_grade as
select product_code, coalesce(grade,'(no grade)') as grade, sum(balance_kg) as balance_kg
from v_batch_balance group by product_code, coalesce(grade,'(no grade)');

-- recovery per production issue (plant + day)
create or replace view v_recovery_by_issue as
select pi.id as production_issue_id, pi.issue_ref, pi.issue_date, pl.code as plant_code,
       pl.region, pl.zone, pi.wholecrab_in_kg,
       coalesce((select sum(qty_kg) from meat_output mo where mo.production_issue_id=pi.id),0) as meat_out_kg,
       case when pi.wholecrab_in_kg > 0
         then round(100.0 * coalesce((select sum(qty_kg) from meat_output mo where mo.production_issue_id=pi.id),0)
                    / pi.wholecrab_in_kg, 2)
         else null end as recovery_pct
from production_issues pi left join plants pl on pl.id=pi.plant_id;

-- recovery per day (all plants pooled) — Tim's top line
create or replace view v_recovery_by_day as
select issue_date,
       sum(wholecrab_in_kg) as wholecrab_in_kg,
       sum(meat_out_kg)     as meat_out_kg,
       case when sum(wholecrab_in_kg) > 0
         then round(100.0 * sum(meat_out_kg)/sum(wholecrab_in_kg),2) else null end as recovery_pct
from v_recovery_by_issue group by issue_date order by issue_date;

-- meat in-process (output not yet transferred) per grade
create or replace view v_meat_wip as
select g.code as meat_grade,
       coalesce((select sum(mo.qty_kg) from meat_output mo where mo.meat_grade_id=g.id),0) as output_kg,
       coalesce((select sum(mt.qty_kg) from meat_transfers mt where mt.meat_grade_id=g.id),0) as transferred_kg,
       coalesce((select sum(mo.qty_kg) from meat_output mo where mo.meat_grade_id=g.id),0)
       - coalesce((select sum(mt.qty_kg) from meat_transfers mt where mt.meat_grade_id=g.id),0) as wip_kg
from meat_grades g;

-- documents at risk (arriving soon, unapproved)
create or replace view v_documents_at_risk as
select c.id as consignment_id, c.supplier, c.container_number, c.status,
       coalesce(c.new_eta,c.original_eta) as eta,
       count(*) filter (where cd.status <> 'approved') as docs_outstanding,
       count(*) as docs_total
from consignments c join consignment_documents cd on cd.consignment_id=c.id
where c.status not in ('received','unloaded')
group by c.id
having count(*) filter (where cd.status <> 'approved') > 0;

-- ============================================================
-- END. Enable RLS + policies when you add auth. For open demo,
-- keep RLS off on these tables or add allow-all policies.
-- ============================================================
