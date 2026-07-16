# TSF Crab Operation

Import → clearance tracker (Slice 1). React + Vite + Supabase + Netlify.

This slice covers: **login with roles**, the **shipment pipeline** (import consignments),
and the **clearance document checklist** with an at-risk view. Warehouse, production,
packing, FG and the local/live pipeline come in later slices.

## 1. Supabase setup (once)

1. Create a Supabase project.
2. SQL Editor → run `supabase_full_schema.sql` (the full schema — later slices reuse it).
3. SQL Editor → run `supabase_auth.sql` (profiles, roles, RLS).
4. Authentication → Providers → enable **Email**.
5. Authentication → Users → **Add user** (your email + password).
6. SQL Editor → make yourself admin:
   ```sql
   update profiles set role='admin', full_name='Viraj'
   where id = (select id from auth.users where email='YOU@EXAMPLE.COM');
   ```

Roles: `admin` (all), `central_entry` (write, all plants), `plant_entry`
(write, own plant — enforced in the production slice), `viewer` (read-only, e.g. Tim).
New sign-ups default to `viewer`.

## 2. Local run (optional)

```bash
cp .env.example .env      # fill in your Supabase URL + anon key
npm install
npm run dev
```

Find the two values in Supabase → Settings → API.

## 3. Deploy to Netlify

1. Push this repo to GitHub.
2. Netlify → Add new site → Import from GitHub → pick this repo.
3. Build command `npm run build`, publish directory `dist` (already in `netlify.toml`).
4. Site settings → Environment variables → add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy. Netlify auto-deploys on every push.

## Structure

```
src/
  lib/          supabase client, constants
  auth/         AuthProvider, Login, RoleGate
  components/   Layout, Badge, Drawer
  features/
    consignments/  data hook + form
    documents/     clearance checklist
  pages/        Pipeline, Shipments, Documents
```

Each later slice (warehouse, production, packing, dashboard) becomes a new
folder under `features/` plus a page — the auth/role plumbing already wraps everything.
