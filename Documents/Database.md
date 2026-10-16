# SchemeMatch AI — Database Design (`Database.md`)

**Database:** Supabase PostgreSQL  
**Authentication:** Supabase Auth (email OTP)  
**Purpose:** Store each user's profile, optional eligibility information, document inventory, scheme-matching results, and applied-scheme history.

> **Important:** Two SQL queries already exist in Supabase, saved as `Scheme1` and `Scheme2`. Their contents have not been inspected here. Review them before running this schema so you do not create duplicate tables, policies, or conflicting columns. This document describes the recommended target schema; it does not claim that every table already exists.

## 1. Design principles

1. Supabase Auth owns login identities and sessions. Do not create a separate password or OTP table.
2. `auth.users.id` is the identity for each account; `profiles.id` uses the same UUID.
3. Private user rows are protected by Row Level Security (RLS).
4. Profile identity, optional eligibility details, and document inventory are separate.
5. A **scheme match** is a result of comparing a profile with a scheme. **Scheme history** tracks schemes a user is considering or has applied for.
6. The tables below store document metadata, not document file contents. If uploads are added, use a private Supabase Storage bucket with separate access policies.
7. Collect only necessary data. Avoid storing full Aadhaar numbers, bank credentials, OTPs, or unnecessary sensitive information.

## 2. Entity relationship overview

```text
Supabase Auth: auth.users
       |
       | 1:1
       v
public.profiles
       |
       | 1:1
       v
public.eligibility_details
       |
       +------ 1:many ------ public.user_documents
       |
       +------ 1:many ------ public.scheme_matches
       |
       +------ 1:many ------ public.scheme_history

public.schemes
       |
       +------ 1:many ------ public.scheme_matches
       |
       +------ 1:many ------ public.scheme_history
```

## 3. Tables and purpose

| Table | Purpose |
|---|---|
| `profiles` | Basic account profile: name, email, timestamps. |
| `eligibility_details` | Optional matching details: state, district, occupation, annual family income, household size, and other user-provided fields. |
| `user_documents` | Document types the user says they have, with status metadata. Does not prove authenticity. |
| `schemes` | Shared scheme catalogue, including official source links and eligibility criteria. |
| `scheme_matches` | Per-user matching assessments, unmet criteria, and missing document types. |
| `scheme_history` | Schemes the user is tracking or has applied for, including status and dates. |

Suggested status values:
- `scheme_matches.match_status`: `eligible`, `potentially_eligible`, `not_eligible`, `needs_more_information`
- `scheme_history.application_status`: `considering`, `saved`, `applied`, `under_review`, `approved`, `rejected`, `withdrawn`, `unknown`
- `user_documents.document_status`: `reported_available`, `uploaded`, `verified`, `rejected`, `expired`, `missing`

These are application conventions, not official government statuses. Validate them in the application and database.

## 4. Recommended SQL schema

Run in Supabase **SQL Editor** only after checking `Scheme1` and `Scheme2`. `IF NOT EXISTS` prevents duplicate table creation, but it does not update an existing table to match this schema. Inspect existing tables and adapt the SQL as needed.

### 4.1 Helper extension

```sql
create extension if not exists pgcrypto;
```

### 4.2 Profiles

```sql
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
```

### 4.3 Optional eligibility details

```sql
create table if not exists public.eligibility_details (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  date_of_birth date,
  state text,
  district text,
  domicile_state text,
  social_category text,
  occupation text,
  annual_family_income numeric(14,2),
  household_size integer check (household_size is null or household_size > 0),
  is_student boolean,
  is_farmer boolean,
  has_disability boolean,
  agricultural_land_acres numeric(10,2),
  additional_details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint annual_family_income_nonnegative
    check (annual_family_income is null or annual_family_income >= 0),
  constraint agricultural_land_nonnegative
    check (agricultural_land_acres is null or agricultural_land_acres >= 0)
);

alter table public.eligibility_details enable row level security;
```

`additional_details` is for future optional fields. Validate its structure and do not put secrets or unnecessary sensitive data in it.

### 4.4 User document inventory

```sql
create table if not exists public.user_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  document_type text not null,
  document_status text not null default 'reported_available'
    check (document_status in (
      'reported_available', 'uploaded', 'verified',
      'rejected', 'expired', 'missing'
    )),
  storage_path text,
  issued_by text,
  expiry_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, document_type)
);

create index if not exists idx_user_documents_user_id
  on public.user_documents(user_id);

alter table public.user_documents enable row level security;
```

`storage_path` is only a private Storage object path if uploads are implemented. Do not store public URLs or file contents here. Only a real verification workflow should set a document to `verified`.

### 4.5 Shared scheme catalogue

```sql
create table if not exists public.schemes (
  id uuid primary key default gen_random_uuid(),
  scheme_code text unique,
  scheme_name text not null,
  department text,
  government_level text
    check (government_level is null or government_level in ('central', 'state', 'local', 'other')),
  state_scope text,
  description text,
  benefits jsonb not null default '{}'::jsonb,
  eligibility_criteria jsonb not null default '{}'::jsonb,
  required_documents jsonb not null default '[]'::jsonb,
  official_url text,
  source_document_name text,
  source_document_url text,
  source_updated_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_schemes_name
  on public.schemes using gin (to_tsvector('english', scheme_name));

create index if not exists idx_schemes_active
  on public.schemes(is_active);

alter table public.schemes enable row level security;
```

The catalogue is shared. Populate it through the scheme-ingestion process or a trusted administrator/backend. Never expose a Supabase secret/service-role key in browser code.

### 4.6 Per-user matching results

```sql
create table if not exists public.scheme_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  scheme_id uuid not null references public.schemes(id) on delete cascade,
  match_status text not null default 'needs_more_information'
    check (match_status in (
      'eligible', 'potentially_eligible',
      'not_eligible', 'needs_more_information'
    )),
  match_score numeric(5,2)
    check (match_score is null or (match_score >= 0 and match_score <= 100)),
  unmet_criteria jsonb not null default '[]'::jsonb,
  missing_documents jsonb not null default '[]'::jsonb,
  explanation text,
  engine_version text,
  assessed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_scheme_matches_user_assessed
  on public.scheme_matches(user_id, assessed_at desc);

create index if not exists idx_scheme_matches_scheme_id
  on public.scheme_matches(scheme_id);

alter table public.scheme_matches enable row level security;
```

Do not present a match score or AI assessment as an official government eligibility decision. If the engine does not calculate a defensible score, leave `match_score` as `NULL`.

### 4.7 Scheme/application history

```sql
create table if not exists public.scheme_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  scheme_id uuid references public.schemes(id) on delete set null,
  scheme_name_snapshot text not null,
  application_status text not null default 'considering'
    check (application_status in (
      'considering', 'saved', 'applied', 'under_review',
      'approved', 'rejected', 'withdrawn', 'unknown'
    )),
  application_reference text,
  applied_at timestamptz,
  last_status_checked_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_scheme_history_user_created
  on public.scheme_history(user_id, created_at desc);

alter table public.scheme_history enable row level security;
```

`scheme_name_snapshot` preserves the name shown to the user if the catalogue record changes. Save an application reference only if needed and supplied by the user.

## 5. Row Level Security (RLS) policies

The following block replaces only policies with these exact names, making this policy block re-runnable. It does not remove differently named policies already on the tables.

```sql
-- Profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
for select to authenticated using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
for insert to authenticated with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
for update to authenticated using (auth.uid() = id)
with check (auth.uid() = id);

-- Eligibility details
drop policy if exists "eligibility_details_select_own" on public.eligibility_details;
create policy "eligibility_details_select_own" on public.eligibility_details
for select to authenticated using (auth.uid() = user_id);

drop policy if exists "eligibility_details_insert_own" on public.eligibility_details;
create policy "eligibility_details_insert_own" on public.eligibility_details
for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "eligibility_details_update_own" on public.eligibility_details;
create policy "eligibility_details_update_own" on public.eligibility_details
for update to authenticated using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "eligibility_details_delete_own" on public.eligibility_details;
create policy "eligibility_details_delete_own" on public.eligibility_details
for delete to authenticated using (auth.uid() = user_id);

-- User documents
drop policy if exists "user_documents_select_own" on public.user_documents;
create policy "user_documents_select_own" on public.user_documents
for select to authenticated using (auth.uid() = user_id);

drop policy if exists "user_documents_insert_own" on public.user_documents;
create policy "user_documents_insert_own" on public.user_documents
for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "user_documents_update_own" on public.user_documents;
create policy "user_documents_update_own" on public.user_documents
for update to authenticated using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "user_documents_delete_own" on public.user_documents;
create policy "user_documents_delete_own" on public.user_documents
for delete to authenticated using (auth.uid() = user_id);

-- Signed-in users can read active scheme catalogue entries.
drop policy if exists "schemes_select_active_authenticated" on public.schemes;
create policy "schemes_select_active_authenticated" on public.schemes
for select to authenticated using (is_active = true);

-- Do not create client INSERT/UPDATE/DELETE policies for schemes.
-- Use a trusted backend/admin workflow for catalogue changes.

-- Scheme matches
drop policy if exists "scheme_matches_select_own" on public.scheme_matches;
create policy "scheme_matches_select_own" on public.scheme_matches
for select to authenticated using (auth.uid() = user_id);

drop policy if exists "scheme_matches_insert_own" on public.scheme_matches;
create policy "scheme_matches_insert_own" on public.scheme_matches
for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "scheme_matches_update_own" on public.scheme_matches;
create policy "scheme_matches_update_own" on public.scheme_matches
for update to authenticated using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "scheme_matches_delete_own" on public.scheme_matches;
create policy "scheme_matches_delete_own" on public.scheme_matches
for delete to authenticated using (auth.uid() = user_id);

-- Scheme history
drop policy if exists "scheme_history_select_own" on public.scheme_history;
create policy "scheme_history_select_own" on public.scheme_history
for select to authenticated using (auth.uid() = user_id);

drop policy if exists "scheme_history_insert_own" on public.scheme_history;
create policy "scheme_history_insert_own" on public.scheme_history
for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "scheme_history_update_own" on public.scheme_history;
create policy "scheme_history_update_own" on public.scheme_history
for update to authenticated using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "scheme_history_delete_own" on public.scheme_history;
create policy "scheme_history_delete_own" on public.scheme_history
for delete to authenticated using (auth.uid() = user_id);
```

**Production note:** If only a trusted backend should create matching assessments, remove the client-facing insert/update policies for `scheme_matches` and write those rows through the backend. Never expose a service-role or secret key to the browser.

## 6. Create a profile after successful OTP verification

After `supabase.auth.verifyOtp(...)` succeeds, save the profile using the authenticated user ID. Do not trust a separately submitted user ID/email as an authorization check.

```js
const {
  data: { user },
  error: userError
} = await supabase.auth.getUser();

if (userError) throw userError;
if (!user) throw new Error('No authenticated user found.');

const { error: profileError } = await supabase
  .from('profiles')
  .upsert({
    id: user.id,
    email: user.email,
    full_name: fullName
  });

if (profileError) throw profileError;
```

If registration collects the name before OTP verification, keep it temporarily in the form state and save it only after verification. Never store OTPs in the database.

Example optional details upsert:

```js
const { error } = await supabase
  .from('eligibility_details')
  .upsert({
    user_id: user.id,
    state,
    district,
    occupation,
    annual_family_income: income,
    household_size: householdSize
  });

if (error) throw error;
```

The values in this example should come from the user's validated inputs, not hardcoded demo data.

## 7. Example frontend queries

### Load profile

```js
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .single();

if (error) throw error;
```

Handle the case where the user has authenticated but a profile row has not yet been created.

### Load matching results with scheme details

```js
const { data, error } = await supabase
  .from('scheme_matches')
  .select(`
    id,
    match_status,
    match_score,
    unmet_criteria,
    missing_documents,
    explanation,
    assessed_at,
    schemes (
      id,
      scheme_name,
      department,
      official_url
    )
  `)
  .order('assessed_at', { ascending: false });

if (error) throw error;
```

### Add a scheme to history

```js
const { data: { user }, error: userError } =
  await supabase.auth.getUser();

if (userError) throw userError;
if (!user) throw new Error('Please sign in first.');

const { error } = await supabase
  .from('scheme_history')
  .insert({
    user_id: user.id,
    scheme_id: selectedScheme.id,
    scheme_name_snapshot: selectedScheme.scheme_name,
    application_status: 'considering'
  });

if (error) throw error;
```

Do not mark a scheme as officially applied, approved, or rejected unless that status was supplied by the user or confirmed by a genuine integration.

## 8. Optional document uploads

The schema tracks document inventory and an optional `storage_path`, but does not create a Storage bucket. If file uploads are added:

- Create a **private** bucket, e.g. `user-documents`.
- Store files under a path scoped to the user's UUID, e.g. `<auth-user-uuid>/<file-name>`.
- Add Storage policies restricting access to the owner's folder.
- Validate file size and type; do not trust file extensions alone.
- Do not use public buckets for personal documents.
- Avoid collecting Aadhaar or other highly sensitive documents unless necessary and supported by a clear privacy/security plan.
- An uploaded file is not automatically a verified document.

## 9. Recommended implementation order

1. Review `Scheme1` and `Scheme2`; note existing tables, columns, and policies.
2. Apply only missing table definitions and adapt any existing schema rather than duplicating it.
3. Apply and inspect RLS policies for every user-specific table.
4. Test email OTP login and create a `profiles` row after successful verification.
5. Test saving and reloading eligibility details.
6. Add document inventory.
7. Populate `schemes` through the scheme ingestion process using official sources.
8. Connect the matching engine to write `scheme_matches`.
9. Add saved/applied schemes to `scheme_history`.
10. Test with two accounts and confirm neither can access the other's private records.

## 10. Acceptance checklist

- [ ] Each authenticated user has at most one profile row.
- [ ] Profile and eligibility data persist after logout and login.
- [ ] Optional fields may remain blank.
- [ ] Users can access only their own profile, eligibility data, documents, matches, and history.
- [ ] Signed-in users can read active scheme catalogue records.
- [ ] Untrusted clients cannot modify the shared scheme catalogue.
- [ ] AI matching is not presented as official government approval.
- [ ] No OTP, password, Supabase secret key, or Resend API key is stored in the database or exposed in frontend code.
- [ ] A two-account test confirms row isolation.
- [ ] `Scheme1` and `Scheme2` have been reviewed to prevent duplicate or conflicting schema.

## 11. Official references

- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Auth: https://supabase.com/docs/guides/auth
- Supabase JavaScript client: https://supabase.com/docs/reference/javascript/introduction
- Supabase Storage access control: https://supabase.com/docs/guides/storage/security/access-control
