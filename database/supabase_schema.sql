-- ==============================================================================
-- SchemeMatch AI — Database Schema, Row Level Security (RLS) & Seed Data
-- Target: Supabase (PostgreSQL)
-- Project URL: https://fyasdgwxqyurjawnxlmr.supabase.co
-- ==============================================================================

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";

-- 2. CITIZEN PROFILES TABLE
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    full_name text not null default 'Citizen User',
    email text,
    phone text default '+91 98765 43210',
    date_of_birth date default '1992-05-18',
    age integer generated always as (date_part('year', age(current_date, date_of_birth))::integer) stored,
    gender text check (gender in ('Female', 'Male', 'Transgender', 'Other')) default 'Female',
    marital_status text check (marital_status in ('Married', 'Unmarried', 'Widowed', 'Divorced', 'Abandoned', 'Destitute')) default 'Married',
    domicile_state text default 'Maharashtra',
    district_taluka text default 'Pune, Haveli',
    residential_category text check (residential_category in ('Urban (Corporation Limit)', 'Rural (Gram Panchayat)', 'Semi-Urban')) default 'Urban (Corporation Limit)',
    ration_card_category text check (ration_card_category in ('Orange (APL)', 'Yellow (BPL)', 'White', 'Antyodaya (AAY)')) default 'Orange (APL)',
    category_reservation text check (category_reservation in ('General', 'OBC (Non-Creamy)', 'OBC (Creamy)', 'SC', 'ST', 'EWS', 'VJNT', 'SBC')) default 'OBC (Non-Creamy)',
    is_divyangjan boolean default false,
    disability_percentage integer default 0,
    annual_income numeric default 210000,
    occupation text default 'Self-Employed / Small Retailer',
    land_holding_acres numeric default 0.0,
    aadhaar_masked text default 'XXXX-XXXX-8921',
    pan_masked text default 'ABCDE1234F',
    ration_card_number text default 'MH-08-394821',
    npci_dbt_active boolean default true,
    household_dependents jsonb default '[
        {"name": "Aarav Sharma", "relation": "Son", "age": 9, "occupation": "Student", "category": "Primary School"},
        {"name": "Rohan Sharma", "relation": "Spouse", "age": 35, "occupation": "Transport Contractor", "category": "Co-Applicant"}
    ]'::jsonb,
    profile_completion_score integer default 68,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- 3. SCHEMES REPOSITORY TABLE
create table if not exists public.schemes (
    id text primary key,
    name text not null,
    department text not null,
    category text not null,
    scope text not null default 'Maharashtra State',
    monthly_benefit text,
    annual_benefit text,
    summary text not null,
    age_min integer,
    age_max integer,
    gender_target text,
    income_max numeric,
    ration_card_eligible text[],
    exclusions text[],
    core_eligibility jsonb default '[]'::jsonb,
    required_documents jsonb default '[]'::jsonb,
    timelines jsonb default '{}'::jsonb,
    application_steps jsonb default '[]'::jsonb,
    portal_name text,
    portal_url text,
    helpline text,
    verification_status text default 'verified',
    created_at timestamptz default now()
);

-- 4. USER SAVED SCHEMES / APPLICATIONS TABLE
create table if not exists public.user_saved_schemes (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    scheme_id text references public.schemes(id) on delete cascade not null,
    status text check (status in ('potential_match', 'applied', 'under_review', 'approved_disbursing', 'rejected')) default 'potential_match',
    app_id text,
    match_score integer default 85,
    liked boolean default false,
    disbursements jsonb default '[]'::jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique(user_id, scheme_id)
);

-- 5. USER DOCUMENT CHECKLIST TABLE
create table if not exists public.user_documents (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    document_name text not null,
    status text check (status in ('ready', 'missing', 'not_checked', 'verified')) default 'not_checked',
    notes text,
    updated_at timestamptz default now(),
    unique(user_id, document_name)
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

alter table public.profiles enable row level security;
alter table public.schemes enable row level security;
alter table public.user_saved_schemes enable row level security;
alter table public.user_documents enable row level security;

-- Schemes are readable by ANY authenticated or anonymous user
create policy "Allow public read access to schemes"
    on public.schemes for select
    using (true);

-- Profiles policies
create policy "Users can view their own profile"
    on public.profiles for select
    using (auth.uid() = id);

create policy "Users can insert their own profile"
    on public.profiles for insert
    with check (auth.uid() = id);

create policy "Users can update their own profile"
    on public.profiles for update
    using (auth.uid() = id);

-- User saved schemes policies
create policy "Users can view their saved schemes"
    on public.user_saved_schemes for select
    using (auth.uid() = user_id);

create policy "Users can insert their saved schemes"
    on public.user_saved_schemes for insert
    with check (auth.uid() = user_id);

create policy "Users can update their saved schemes"
    on public.user_saved_schemes for update
    using (auth.uid() = user_id);

create policy "Users can delete their saved schemes"
    on public.user_saved_schemes for delete
    using (auth.uid() = user_id);

-- User documents policies
create policy "Users can view their documents"
    on public.user_documents for select
    using (auth.uid() = user_id);

create policy "Users can insert their documents"
    on public.user_documents for insert
    with check (auth.uid() = user_id);

create policy "Users can update their documents"
    on public.user_documents for update
    using (auth.uid() = user_id);

create policy "Users can delete their documents"
    on public.user_documents for delete
    using (auth.uid() = user_id);

-- ==============================================================================
-- AUTOMATIC PROFILE CREATION TRIGGER
-- ==============================================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, full_name, email)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'full_name', 'Citizen User'),
        new.email
    )
    on conflict (id) do nothing;
    return new;
end;
$$ language plpgsql security definer;

-- Trigger execution on auth.users creation
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- ==============================================================================
-- SEED DATA: OFFICIAL GOVERNMENT SCHEMES
-- ==============================================================================

insert into public.schemes (
    id, name, department, category, scope,
    monthly_benefit, annual_benefit, summary,
    age_min, age_max, gender_target, income_max,
    ration_card_eligible, exclusions,
    core_eligibility, required_documents, timelines, application_steps,
    portal_name, portal_url, helpline
) values 
(
    'ladki-bahin-yojana',
    'Mukhyamantri Majhi Ladki Bahin Yojana',
    'Dept. of Women & Child Development',
    'Women Empowerment',
    'Maharashtra State',
    '₹1,500',
    '₹18,000',
    'Flagship welfare initiative providing unconditional monthly financial aid deposited directly into the Aadhaar-linked savings account of resident women to ensure self-reliance, nutritional security, and dignity.',
    21, 65, 'Female', 250000,
    array['Orange (APL)', 'Yellow (BPL)', 'Antyodaya (AAY)'],
    array['Family members holding regular government employment', 'Sitting MP/MLAs', 'Families paying income tax or owning 4-wheelers (excluding tractors)'],
    '[
        {"id": "income", "title": "Income Threshold", "desc": "Combined gross annual family income must not exceed ₹2,50,000 (verified by Tahsildar or Orange/Yellow Ration Card).", "status_key": "income_check"},
        {"id": "gender_age", "title": "Target Demographic Status", "desc": "Married, widowed, divorced, abandoned, destitute, or single unmarried women aged 21 to 65 years meeting domicile criteria.", "status_key": "age_gender_check"},
        {"id": "domicile", "title": "Maharashtra Domicile", "desc": "Must possess Maharashtra Domicile Certificate or 15-year School Leaving Certificate / Voter ID.", "status_key": "domicile_check"},
        {"id": "exclusions", "title": "Exclusion Clauses", "desc": "No family members holding regular govt jobs, pension > ₹2,500/mo, or owning 4-wheelers.", "status_key": "exclusion_check"}
    ]'::jsonb,
    '[
        {"name": "Aadhaar Card", "mandatory": true, "note": "Linked to active mobile number and seeded with active DBT bank account", "status": "ready"},
        {"name": "Maharashtra Domicile Certificate", "mandatory": true, "note": "Or 15-Year School Leaving Certificate / Ration Card / Voter ID", "status": "ready"},
        {"name": "Family Income Certificate (< ₹2.5L)", "mandatory": false, "note": "Exempted if valid Orange or Yellow Ration Card is held", "status": "missing"},
        {"name": "Bank Passbook / NPCI DBT Account", "mandatory": true, "note": "Account must be in applicant''s individual name", "status": "ready"},
        {"name": "Hamipatra (Self-Declaration Form)", "mandatory": true, "note": "Government statutory affirmation format downloadable online", "status": "missing"},
        {"name": "Passport Size Photograph", "mandatory": true, "note": "Color photo with white background (< 200KB)", "status": "ready"}
    ]'::jsonb,
    '{
        "submission_window": "Continuous Rolling Admission",
        "next_cutoff": "31st March 2026 (Extended Phase)",
        "scrutiny_period": "15 to 21 Working Days (Ward Committee / Anganwadi)",
        "grievance_window": "7 Days Window after SMS alert",
        "disbursement_frequency": "Monthly on 5th & 20th via APB"
    }'::jsonb,
    '[
        {"step": 1, "title": "Select Filing Channel", "desc": "Apply online via Nari Shakti Doot App / Aaple Sarkar portal or physically visit nearest Setu Suvidha Kendra."},
        {"step": 2, "title": "Biometric / OTP KYC", "desc": "Authenticate via Aadhaar OTP on your registered mobile number or biometric thumb-scan at Anganwadi."},
        {"step": 3, "title": "Document Upload", "desc": "Scan or capture clear copies of Domicile, Bank Passbook, Hamipatra affirmation, and Ration/Income slip."},
        {"step": 4, "title": "Sanction & DBT Credit", "desc": "Receive SMS order status. DBT transfers automatically credit directly to your active Aadhaar-linked account."}
    ]'::jsonb,
    'mahadbt.maharashtra.gov.in',
    'https://mahadbt.maharashtra.gov.in',
    '181 / 1800-120-8040'
),
(
    'pmmvy-maternity',
    'Pradhan Mantri Matru Vandana Yojana (PMMVY)',
    'Ministry of Women and Child Development',
    'Maternity & Health',
    'Central Govt',
    '₹5,000',
    '₹5,000 (Lump sum in installments)',
    'Direct conditional cash incentive for pregnant women and lactating mothers for the first living child of the family to improve health-seeking behaviour and compensate for wage loss.',
    19, 45, 'Female', 800000,
    array['Orange (APL)', 'Yellow (BPL)', 'Antyodaya (AAY)', 'White'],
    array['Women who are in regular employment with Central or State Government or PSUs'],
    '[
        {"id": "pregnancy_stage", "title": "Lactating or Pregnant Mother", "desc": "Registered at Anganwadi Centre within 150 days of LMP.", "status_key": "pregnancy_check"},
        {"id": "institutional_checkup", "title": "Antenatal Check-up (ANC)", "desc": "Must undergo at least one ANC and institutional registration.", "status_key": "anc_check"},
        {"id": "dbt_account", "title": "Individual DBT Bank Account", "desc": "Individual bank/post office account linked with Aadhaar.", "status_key": "dbt_check"}
    ]'::jsonb,
    '[
        {"name": "Aadhaar Card of Mother", "mandatory": true, "note": "Required for DBT", "status": "ready"},
        {"name": "Aadhaar Card of Husband", "mandatory": false, "note": "Optional identity reference", "status": "ready"},
        {"name": "MCP Card (Mother and Child Protection)", "mandatory": true, "note": "Issued by Anganwadi / Govt Hospital", "status": "missing"},
        {"name": "Bank Passbook Copy", "mandatory": true, "note": "Showing IFSC and Account number", "status": "ready"}
    ]'::jsonb,
    '{
        "submission_window": "Within 270 days of LMP",
        "next_cutoff": "Open Year-Round",
        "scrutiny_period": "30 Days",
        "grievance_window": "15 Days",
        "disbursement_frequency": "Installments: ₹3,000 + ₹2,000"
    }'::jsonb,
    '[
        {"step": 1, "title": "Register at AWC", "desc": "Fill Form 1-A at local Anganwadi Centre within 150 days of LMP."},
        {"step": 2, "title": "Submit MCP Details", "desc": "Provide immunization and ANC proof after delivery."},
        {"step": 3, "title": "Direct Transfer", "desc": "Amount credited in two installments via PFMS/DBT."}
    ]'::jsonb,
    'pmmvy.wcd.gov.in',
    'https://pmmvy.wcd.gov.in',
    '1098 / 011-23382393'
),
(
    'pm-kisan',
    'PM Kisan Samman Nidhi',
    'Ministry of Agriculture & Farmers Welfare',
    'Agriculture Support',
    'Central Govt',
    '₹500',
    '₹6,000',
    'Income support of ₹6,000 per year in three equal installments of ₹2,000 every four months to all landholding farmer families across the country.',
    18, 90, null, 1500000,
    null,
    array['Institutional landholders', 'Farmer families holding constitutional posts', 'Current/former ministers, MPs, MLAs', 'Income tax payers in last assessment year'],
    '[
        {"id": "land_ownership", "title": "Agricultural Land Record", "desc": "Must be registered landholding farmer with cultivable land in official revenue records (7/12 extract).", "status_key": "land_check"},
        {"id": "ekyc_done", "title": "Mandatory e-KYC Completed", "desc": "Aadhaar OTP or biometric facial e-KYC completed on PM Kisan portal.", "status_key": "ekyc_check"},
        {"id": "tax_exclusion", "title": "Non-Income Tax Payer", "desc": "No member of family paid income tax in last assessment year.", "status_key": "tax_check"}
    ]'::jsonb,
    '[
        {"name": "Aadhaar Card", "mandatory": true, "note": "Linked with land records", "status": "ready"},
        {"name": "7/12 & 8-A Land Record Extract", "mandatory": true, "note": "Certified by Talathi / Revenue Authority", "status": "missing"},
        {"name": "Bank Passbook with NPCI Seeding", "mandatory": true, "note": "Active DBT account", "status": "ready"}
    ]'::jsonb,
    '{
        "submission_window": "Open Throughout Year",
        "next_cutoff": "Next Tranche: November 2026",
        "scrutiny_period": "State Nodal Review",
        "grievance_window": "Direct Farmer Helpdesk",
        "disbursement_frequency": "₹2,000 every 4 months (Apr, Aug, Dec)"
    }'::jsonb,
    '[
        {"step": 1, "title": "Farmer Registration", "desc": "Self-register via pmkisan.gov.in or Common Service Centre (CSC)."},
        {"step": 2, "title": "Complete e-KYC", "desc": "Authenticate using Aadhaar OTP on the PM-KISAN mobile app or portal."},
        {"step": 3, "title": "State Verification", "desc": "District agriculture officer verifies land title on Bhulekh portal."},
        {"step": 4, "title": "DBT Release", "desc": "Direct credit of ₹2,000 directly into bank account."}
    ]'::jsonb,
    'pmkisan.gov.in',
    'https://pmkisan.gov.in',
    '155261 / 1800-115-526'
),
(
    'post-matric-obc',
    'Post Matric Scholarship for OBC Students',
    'Social Justice & Special Assistance Dept.',
    'Education & Skill',
    'Maharashtra State',
    '₹1,200',
    '₹14,400 (Tuition + Exam + Maintenance)',
    'Financial assistance to Other Backward Class (OBC) students studying at post-secondary or post-matriculation stage to enable them to complete higher education.',
    16, 35, null, 150000,
    array['Orange (APL)', 'Yellow (BPL)'],
    array['Students pursuing second degree of same level', 'Students enrolled in distance mode without lab work'],
    '[
        {"id": "category", "title": "OBC Category Certificate", "desc": "Valid Caste Certificate issued by competent authority in Maharashtra.", "status_key": "category_check"},
        {"id": "caste_validity", "title": "Caste Validity & Non-Creamy Layer", "desc": "Valid Non-Creamy Layer (NCL) certificate for current financial year.", "status_key": "ncl_check"},
        {"id": "income_limit", "title": "Income Below ₹1.5 Lakh", "desc": "Annual family income not exceeding ₹1,50,000 for 100% scholarship or ₹8,00,000 for freeship.", "status_key": "income_check"}
    ]'::jsonb,
    '[
        {"name": "Caste Certificate", "mandatory": true, "note": "Issued by Sub-Divisional Officer", "status": "ready"},
        {"name": "Non-Creamy Layer (NCL) Certificate", "mandatory": true, "note": "Valid for current financial year", "status": "ready"},
        {"name": "Income Certificate from Tahsildar", "mandatory": true, "note": "Showing income < ₹1.5 Lakh", "status": "missing"},
        {"name": "10th / 12th Marksheet & CAP Allotment Letter", "mandatory": true, "note": "College admission verification", "status": "ready"},
        {"name": "Fee Receipt & College Bonafide", "mandatory": true, "note": "Issued by principal", "status": "ready"}
    ]'::jsonb,
    '{
        "submission_window": "Academic Year Admission Cycle",
        "next_cutoff": "31st December 2026",
        "scrutiny_period": "College Principal + District Welfare Officer",
        "grievance_window": "7 Days re-upload",
        "disbursement_frequency": "Twice a year directly to student and college"
    }'::jsonb,
    '[
        {"step": 1, "title": "Create MahaDBT Account", "desc": "Login with Aadhaar authentication on mahadbt.maharashtra.gov.in"},
        {"step": 2, "title": "Profile Details", "desc": "Complete caste, domicile, college admission, and past academic records."},
        {"step": 3, "title": "Apply for Scheme", "desc": "Select Department of Other Backward Bahujan Welfare and submit."},
        {"step": 4, "title": "Verification & Sanction", "desc": "College scrutinizes application; state disburses scholarship."}
    ]'::jsonb,
    'mahadbt.maharashtra.gov.in',
    'https://mahadbt.maharashtra.gov.in',
    '022-49150800'
),
(
    'ayushman-bharat',
    'Ayushman Bharat (PM-JAY)',
    'National Health Authority',
    'Healthcare & Insurance',
    'National Initiative',
    '₹41,666',
    '₹5,00,000 (Health Cover per family)',
    'World''s largest government-funded healthcare assurance scheme providing a health cover of ₹5 lakh per family per year for secondary and tertiary care hospitalization.',
    0, 100, null, null,
    array['Yellow (BPL)', 'Antyodaya (AAY)', 'SECC Eligible'],
    array['Families owning motorized 3/4 wheelers', 'Govt employees with CGHS cover'],
    '[
        {"id": "secc_or_ration", "title": "SECC 2011 / Deprivation Criteria", "desc": "Household identified under rural deprivation or urban occupational criteria or NFSA ration card.", "status_key": "deprivation_check"},
        {"id": "ayushman_card", "title": "Ayushman PVC / Golden Card", "desc": "Card generated via e-KYC at PMAM desk or Setu Kendra.", "status_key": "card_check"}
    ]'::jsonb,
    '[
        {"name": "Ration Card (Yellow / Antyodaya / NFSA)", "mandatory": true, "note": "Used for family verification", "status": "ready"},
        {"name": "Aadhaar Card", "mandatory": true, "note": "Individual biometric verification", "status": "ready"}
    ]'::jsonb,
    '{
        "submission_window": "Continuous Emergency & Elective Coverage",
        "next_cutoff": "Active Lifetime Benefit",
        "scrutiny_period": "Instant at Hospital PMAM kiosk",
        "grievance_window": "24x7 Call Center",
        "disbursement_frequency": "Cashless at 27,000+ empanelled hospitals"
    }'::jsonb,
    '[
        {"step": 1, "title": "Check Eligibility", "desc": "Search name on beneficiary.nha.gov.in or dial 14555."},
        {"step": 2, "title": "Generate Ayushman Card", "desc": "Do facial or OTP e-KYC on the Ayushman App."},
        {"step": 3, "title": "Show at Hospital", "desc": "Present card at any network hospital for completely cashless treatment up to ₹5 Lakh."}
    ]'::jsonb,
    'nha.gov.in',
    'https://nha.gov.in',
    '14555 / 1800-111-565'
),
(
    'pm-svanidhi',
    'PM SVANidhi (Microcredit for Street Vendors)',
    'Ministry of Housing and Urban Affairs',
    'MSME & Livelihood',
    'Central Govt',
    '₹10,000',
    '₹50,000 (Graduated Tranches: 10K, 20K, 50K)',
    'Special micro-credit facility providing collateral-free working capital loan to urban street vendors, hawkers, and small retailers with 7% interest subsidy and cashback on digital transactions.',
    18, 70, null, 300000,
    null,
    array['Vendors without local vending certificate or letter of recommendation'],
    '[
        {"id": "vending_proof", "title": "Urban Street Vendor / Retailer", "desc": "Possession of Certificate of Vending / ID Card issued by Urban Local Body (ULB) or Letter of Recommendation (LoR).", "status_key": "vending_check"},
        {"id": "digital_onboarding", "title": "Digital Payment Enabled", "desc": "Willingness to receive and disburse via UPI QR code to earn up to ₹1,200 annual cashback.", "status_key": "digital_check"}
    ]'::jsonb,
    '[
        {"name": "Aadhaar Card", "mandatory": true, "note": "Identity verification", "status": "ready"},
        {"name": "Vending Certificate / LoR from Municipal Corporation", "mandatory": true, "note": "Pune Municipal Corp / Nagar Palika", "status": "missing"},
        {"name": "Bank Account Passbook", "mandatory": true, "note": "Where loan is credited", "status": "ready"}
    ]'::jsonb,
    '{
        "submission_window": "Open Under Extended Phase",
        "next_cutoff": "Open Lending Window",
        "scrutiny_period": "7 to 10 Days Banking Approval",
        "grievance_window": "Direct Bank Grievance Officer",
        "disbursement_frequency": "Tranche 1: ₹10,000; Tranche 2: ₹20,000; Tranche 3: ₹50,000"
    }'::jsonb,
    '[
        {"step": 1, "title": "Check Vending Survey", "desc": "Verify name in ULB vendor list or obtain LoR from municipal ward office."},
        {"step": 2, "title": "Apply Online", "desc": "Submit mobile-linked Aadhaar application on pmsvanidhi.mohua.gov.in."},
        {"step": 3, "title": "Lending Partner Sanction", "desc": "Bank or NBFC approves collateral-free loan without processing fees."}
    ]'::jsonb,
    'pmsvanidhi.mohua.gov.in',
    'https://pmsvanidhi.mohua.gov.in',
    '1800-11-1979'
);

-- End of Supabase Schema & Seed Script
