// ==============================================================================
// SchemeMatch AI — Frontend Configuration
// ==============================================================================

export const CONFIG = {
  // Supabase Configuration provided by user
  SUPABASE_URL: 'https://fyasdgwxqyurjawnxlmr.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_S8BXSSNVSsoSWHSnkinsbQ_DKqA9ZuJ',
  
  // Backend API Configuration (FastAPI connecting to local Ollama)
  API_BASE_URL: 'http://127.0.0.1:8000',

  // App Metadata
  APP_NAME: 'SchemeMatch AI',
  APP_SUBTITLE: 'Reverse-Matching Government Scheme Eligibility & Document Gap Engine',
  REGISTRY_VERSION: 'v2.4.0',
  STATE_DATABASE: 'Maharashtra State & Central Gazettes',

  // Mock Citizen Profile (fallback when offline or before Supabase sync)
  DEFAULT_CITIZEN: {
    id: 'user-priya-sharma-1',
    full_name: 'Priya Sharma',
    email: 'priya.sharma@example.gov.in',
    phone: '+91 98765 43210',
    date_of_birth: '1992-05-18',
    gender: 'Female',
    marital_status: 'Married',
    domicile_state: 'Maharashtra',
    district_taluka: 'Pune, Haveli',
    residential_category: 'Urban (Corporation Limit)',
    ration_card_category: 'Orange (APL)',
    ration_card_number: 'MH-08-394821',
    category_reservation: 'OBC (Non-Creamy)',
    is_divyangjan: false,
    annual_income: 210000,
    occupation: 'Self-Employed / Small Retailer',
    land_holding_acres: 0.0,
    aadhaar_masked: 'XXXX-XXXX-8921',
    pan_masked: 'ABCDE1234F',
    npci_dbt_active: true,
    household_dependents: [
      { name: 'Aarav Sharma', relation: 'Son', age: 9, occupation: 'Student', category: 'Primary School' },
      { name: 'Rohan Sharma', relation: 'Spouse', age: 35, occupation: 'Transport Contractor', category: 'Co-Applicant' }
    ],
    profile_completion_score: 68
  }
};
