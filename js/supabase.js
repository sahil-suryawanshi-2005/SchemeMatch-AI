// ==============================================================================
// SchemeMatch AI — Supabase Client & Database Services
// ==============================================================================

import { CONFIG } from './config.js';

// Initialize the Supabase Client if available globally
let supabaseClient = null;

try {
  if (window.supabase && CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY) {
    supabaseClient = window.supabase.createClient(
      CONFIG.SUPABASE_URL,
      CONFIG.SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    );
    console.log('✅ Supabase client initialized with URL:', CONFIG.SUPABASE_URL);
  }
} catch (err) {
  console.warn('⚠️ Supabase SDK initialization warning:', err);
}

export const getSupabase = () => supabaseClient;

// ==============================================================================
// AUTHENTICATION API
// ==============================================================================

export const authService = {
  // Check active session
  async getSession() {
    if (!supabaseClient) return null;
    try {
      const { data, error } = await supabaseClient.auth.getSession();
      if (error) throw error;
      return data?.session || null;
    } catch (err) {
      console.error('Error fetching session:', err);
      return null;
    }
  },

  // Get authenticated user
  async getUser() {
    if (!supabaseClient) return null;
    try {
      const { data, error } = await supabaseClient.auth.getUser();
      if (error) throw error;
      return data?.user || null;
    } catch (err) {
      console.error('Error fetching user:', err);
      return null;
    }
  },

  // Listen to auth changes
  onAuthStateChange(callback) {
    if (!supabaseClient) return { data: { subscription: { unsubscribe: () => {} } } };
    return supabaseClient.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  },

  // Sign in with Email & Password
  async signInWithPassword(email, password) {
    if (!supabaseClient) {
      throw new Error('Supabase is not initialized');
    }
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  },

  // Sign up with Email, Password and Metadata
  async signUp(email, password, fullName, metadata = {}) {
    if (!supabaseClient) {
      throw new Error('Supabase is not initialized');
    }
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          ...metadata
        }
      }
    });
    if (error) throw error;
    return data;
  },

  // Sign in / Sign up with OTP / Magic Link (matches working Resend email template)
  async signInWithOtp(email) {
    if (!supabaseClient) {
      throw new Error('Supabase is not initialized');
    }
    const { data, error } = await supabaseClient.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true
      }
    });
    if (error) throw error;
    return data;
  },

  // Verify 6-digit OTP (strictly type: 'email' for signInWithOtp)
  async verifyOtp(email, token, type = 'email') {
    if (!supabaseClient) {
      throw new Error('Supabase is not initialized');
    }
    const result = await supabaseClient.auth.verifyOtp({
      email,
      token,
      type
    });
    if (result.error) throw result.error;
    return result.data;
  },

  // Resend OTP code using signInWithOtp
  async resendOtp(email) {
    return this.signInWithOtp(email);
  },

  // Sign out
  async signOut() {
    try {
      if (supabaseClient) {
        await supabaseClient.auth.signOut();
      }
    } catch (err) {
      console.warn('Sign out note:', err);
    } finally {
      localStorage.removeItem('schemematch_user_id');
      localStorage.removeItem('schemematch_user_email');
      localStorage.removeItem('schemematch_user_name');
      sessionStorage.removeItem('schemematch_auth_email');
      sessionStorage.removeItem('schemematch_pending_name');
    }
  }
};

// ==============================================================================
// DATABASE API (CITIZEN PROFILES, SCHEMES & SAVED RESULTS)
// ==============================================================================

export const dbService = {
  // Fetch citizen profile by user ID
  async getProfile(userId) {
    if (!supabaseClient || !userId) return null;
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Supabase profile query error:', error);
      throw error;
    }
    return data;
  },

  // Save / Update citizen profile in profiles table
  async saveProfile(profileData, userId = null) {
    if (!supabaseClient) {
      throw new Error('Supabase client is not initialized');
    }
    if (!userId) {
      throw new Error('User ID is required to save profile');
    }

    const payload = {
      ...profileData,
      id: userId,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabaseClient
      .from('profiles')
      .upsert(payload, { onConflict: 'id' })
      .select();

    if (error) {
      console.error('Supabase profile save error:', error);
      throw error;
    }

    localStorage.setItem('schemematch_profile', JSON.stringify(data?.[0] || payload));
    return data?.[0] || payload;
  },

  // Fetch eligibility details from user_details table
  async getUserDetails(userId) {
    if (!supabaseClient || !userId) return null;
    const { data, error } = await supabaseClient
      .from('user_details')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Supabase user_details query error:', error);
      throw error;
    }
    return data;
  },

  // Save / Update eligibility details in user_details table (upsert with user_id key)
  async saveUserDetails(userId, details) {
    if (!supabaseClient) {
      throw new Error('Supabase client is not initialized');
    }
    if (!userId) {
      throw new Error('User ID is required to save eligibility details');
    }

    const payload = {
      user_id: userId,
      ...details,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabaseClient
      .from('user_details')
      .upsert(payload, { onConflict: 'user_id' })
      .select();

    if (error) {
      console.error('Supabase user_details save error:', error);
      throw error;
    }

    return data?.[0] || payload;
  },

  // Fetch all schemes from Supabase or fallback starter pack
  async getSchemes() {
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from('schemes')
          .select('*')
          .order('name');

        if (data && data.length > 0 && !error) {
          return data;
        }
      } catch (err) {
        console.info('Remote schemes fetch: using verified local schemes seed catalogue.', err?.message);
      }
    }

    // Default verified seed schemes (identical to the designs)
    return [
      {
        id: 'ladki-bahin-yojana',
        name: 'Mukhyamantri Majhi Ladki Bahin Yojana',
        department: 'Dept. of Women & Child Development',
        category: 'Women Empowerment',
        scope: 'Maharashtra State',
        monthly_benefit: '₹1,500',
        annual_benefit: '₹18,000',
        age_min: 21,
        age_max: 65,
        gender_target: 'Female',
        income_max: 250000,
        summary: 'Flagship welfare initiative providing unconditional monthly financial aid directly deposited into the Aadhaar-linked savings accounts of resident women to ensure self-reliance, nutritional security, and dignity.',
        core_eligibility: [
          { id: 'income', title: 'Income Threshold', desc: 'Combined gross annual family income must not exceed ₹2,50,000 (verified by Tahsildar or Orange/Yellow Ration Card).' },
          { id: 'gender_age', title: 'Target Demographic Status', desc: 'Married, widowed, divorced, abandoned, destitute, or single unmarried women meeting poverty and domicile criteria.' },
          { id: 'exclusions', title: 'Exclusion Clauses', desc: 'Family members holding regular govt employment, sitting MP/MLAs, or families paying income tax or owning 4-wheelers (excluding tractors).' }
        ],
        required_documents: [
          { name: 'Aadhaar Card', mandatory: true, note: 'Linked to mobile number and active DBT bank account', status: 'ready' },
          { name: 'Maharashtra Domicile Certificate', mandatory: true, note: 'Or 15-Year School Leaving Certificate / Voter ID', status: 'ready' },
          { name: 'Family Income Certificate (< ₹2.5L)', mandatory: false, note: 'Issued by Tahsildar OR valid Yellow/Orange Ration Card', status: 'missing' },
          { name: 'Bank Passbook / NPCI DBT Account', mandatory: true, note: 'Account must be in applicant’s individual name', status: 'ready' },
          { name: 'Hamipatra (Self-Declaration Form)', mandatory: true, note: 'Government statutory affirmation format', status: 'missing' },
          { name: 'Passport Size Photograph', mandatory: true, note: 'Color photo with white background (< 200KB)', status: 'ready' }
        ],
        timelines: {
          next_cutoff: '31st March 2026 (Extended Phase)',
          submission_window: 'Continuous rolling admission. Approvals processed on the 10th and 25th of every calendar month.',
          scrutiny_period: '15 to 21 Working Days (Ward Committee / Anganwadi)',
          grievance_window: '7 Days Window after SMS alert',
          disbursement_frequency: 'Bi-weekly batches on 5th & 20th via APB'
        },
        application_steps: [
          { step: 1, title: 'Select Filing Channel', desc: 'Apply online via Nari Shakti Doot App / Aaple Sarkar portal or physically visit nearest Setu Suvidha Kendra.' },
          { step: 2, title: 'Biometric / OTP KYC', desc: 'Authenticate via Aadhaar OTP on your registered mobile number or biometric thumb-scan at authorized Anganwadi centres.' },
          { step: 3, title: 'Document Upload', desc: 'Scan or capture clear copies of your Domicile, Bank Passbook, Hamipatra affirmation, and Ration/Income slip.' },
          { step: 4, title: 'Sanction & DBT Credit', desc: 'Receive SMS order status. DBT transfers automatically credit directly to your active Aadhaar-linked account.' }
        ],
        portal_name: 'mahadbt.maharashtra.gov.in',
        portal_url: 'https://mahadbt.maharashtra.gov.in',
        helpline: '181 / 1800-120-8040',
        verification_status: 'verified'
      },
      {
        id: 'pmmvy-maternity',
        name: 'Pradhan Mantri Matru Vandana Yojana (PMMVY)',
        department: 'Ministry of Women and Child Development',
        category: 'Maternity & Child Care',
        scope: 'Central Govt',
        monthly_benefit: '₹5,000',
        annual_benefit: '₹5,000 Direct DBT',
        age_min: 19,
        age_max: 45,
        gender_target: 'Female',
        income_max: 800000,
        summary: 'Maternity benefit of ₹5,000 for pregnant women and lactating mothers for early registration and institutional child birth.',
        core_eligibility: [
          { id: 'pregnancy', title: 'Lactating/Pregnant Mother', desc: 'First living child of the family registered within 150 days of LMP.' },
          { id: 'anc_checkup', title: 'Antenatal Check-up', desc: 'Complete mandatory ANC checkup at authorized healthcare centre.' }
        ],
        required_documents: [
          { name: 'Aadhaar Card of Mother', mandatory: true, note: 'Identity and DBT linkage', status: 'ready' },
          { name: 'MCP Card (Mother & Child Protection)', mandatory: true, note: 'Issued by Anganwadi / Govt Hospital', status: 'missing' },
          { name: 'Bank Passbook Copy', mandatory: true, note: 'Showing IFSC and Account number', status: 'ready' }
        ],
        timelines: {
          next_cutoff: 'Open Round the Year',
          scrutiny_period: '30 Days via PFMS'
        },
        portal_name: 'pmmvy.wcd.gov.in',
        portal_url: 'https://pmmvy.wcd.gov.in',
        helpline: '1098 / 011-23382393',
        verification_status: 'verified'
      },
      {
        id: 'beti-bachao',
        name: 'Beti Bachao Beti Padhao',
        department: 'Inter-Ministerial Convergence',
        category: 'National Initiative',
        scope: 'National Initiative',
        monthly_benefit: 'Variable Aid',
        annual_benefit: 'Educational Grant & Sukanya Samriddhi',
        age_min: 0,
        age_max: 18,
        gender_target: 'Female',
        income_max: 1000000,
        summary: 'Gender sensitisation, educational incentive packages, and girl child empowerment initiative linked with zero-tax savings bonds.',
        core_eligibility: [
          { id: 'girl_child', title: 'Girl Child Residence', desc: 'Families with girl children below 10 years for Sukanya account opening.' }
        ],
        required_documents: [
          { name: 'Birth Certificate of Girl Child', mandatory: true, note: 'Issued by Registrar of Births', status: 'ready' },
          { name: 'Parent Aadhaar Card', mandatory: true, note: 'Proof of guardianship', status: 'ready' }
        ],
        portal_name: 'wcd.nic.in',
        portal_url: 'https://wcd.nic.in',
        helpline: '1098',
        verification_status: 'verified'
      },
      {
        id: 'pm-kisan',
        name: 'PM Kisan Samman Nidhi',
        department: 'Ministry of Agriculture & Farmers Welfare',
        category: 'Agriculture Support',
        scope: 'Central Govt',
        monthly_benefit: '₹500',
        annual_benefit: '₹6,000 (3 Installments of ₹2,000)',
        age_min: 18,
        age_max: 90,
        gender_target: null,
        income_max: 1500000,
        summary: 'Direct income support of ₹6,000 per year directly to cultivable landholding farmer families with active e-KYC.',
        core_eligibility: [
          { id: 'land', title: 'Agricultural Land Record', desc: 'Must possess cultivable land verified in revenue records (7/12 extract).' },
          { id: 'ekyc', title: 'Mandatory e-KYC Done', desc: 'Facial or biometric Aadhaar authentication completed on portal.' }
        ],
        required_documents: [
          { name: 'Aadhaar Card', mandatory: true, note: 'Linked with land record', status: 'ready' },
          { name: '7/12 & 8-A Land Extract', mandatory: true, note: 'Issued by Talathi / Revenue Officer', status: 'missing' },
          { name: 'NPCI Bank Passbook', mandatory: true, note: 'DBT enabled', status: 'ready' }
        ],
        portal_name: 'pmkisan.gov.in',
        portal_url: 'https://pmkisan.gov.in',
        helpline: '155261 / 1800-115-526',
        verification_status: 'verified'
      },
      {
        id: 'post-matric-scholarship',
        name: 'Post Matric Scholarship for OBC / EBC',
        department: 'Social Justice & Special Assistance Dept.',
        category: 'Education & Skill',
        scope: 'Maharashtra State',
        monthly_benefit: '₹1,200',
        annual_benefit: '₹14,400 + 100% Tuition Waiver',
        age_min: 16,
        age_max: 35,
        gender_target: null,
        income_max: 150000,
        summary: 'Post-secondary education financial support and college tuition fee reimbursement for OBC / EBC students enrolled in recognized institutions.',
        core_eligibility: [
          { id: 'caste', title: 'OBC Category Certificate', desc: 'Valid Maharashtra Caste & Non-Creamy Layer Certificate.' },
          { id: 'income', title: 'Income Cap (< ₹1.5L)', desc: 'Gross annual family income under ₹1,50,000.' }
        ],
        required_documents: [
          { name: 'Caste & Non-Creamy Layer Certificate', mandatory: true, note: 'Valid for current academic year', status: 'ready' },
          { name: 'Tahsildar Income Certificate', mandatory: true, note: 'Income below ₹1.5L', status: 'missing' },
          { name: 'CAP Admission Letter & Fee Receipt', mandatory: true, note: 'College verified', status: 'ready' }
        ],
        portal_name: 'mahadbt.maharashtra.gov.in',
        portal_url: 'https://mahadbt.maharashtra.gov.in',
        helpline: '022-49150800',
        verification_status: 'verified'
      },
      {
        id: 'ayushman-pmjay',
        name: 'Ayushman Bharat (PM-JAY)',
        department: 'National Health Authority',
        category: 'Healthcare & Insurance',
        scope: 'National Initiative',
        monthly_benefit: '₹41,666',
        annual_benefit: '₹5,00,000 Cashless Health Cover',
        age_min: 0,
        age_max: 100,
        gender_target: null,
        income_max: null,
        summary: 'Cashless medical treatment cover of up to ₹5 lakh per family per year across 27,000+ empanelled public and private hospitals.',
        core_eligibility: [
          { id: 'secc', title: 'Deprivation / NFSA Criteria', desc: 'Hold Yellow, Antyodaya ration card or SECC list entry.' }
        ],
        required_documents: [
          { name: 'Ration Card (Yellow/Orange/Antyodaya)', mandatory: true, note: 'Primary family anchor', status: 'ready' },
          { name: 'Aadhaar Card of Family Members', mandatory: true, note: 'Individual e-KYC', status: 'ready' }
        ],
        portal_name: 'nha.gov.in',
        portal_url: 'https://nha.gov.in',
        helpline: '14555',
        verification_status: 'verified'
      }
    ];
  },

  // Save / toggle saved scheme
  async saveUserScheme(userId, schemeId, status = 'potential_match') {
    const key = `schemematch_saved_${userId || 'guest'}`;
    let saved = JSON.parse(localStorage.getItem(key) || '[]');
    const existingIndex = saved.findIndex(s => s.scheme_id === schemeId);
    
    if (existingIndex >= 0) {
      saved[existingIndex].status = status;
    } else {
      saved.push({
        id: 'save-' + Date.now(),
        scheme_id: schemeId,
        status,
        app_id: 'APP-2024-MH-' + Math.floor(1000 + Math.random() * 9000),
        liked: true,
        created_at: new Date().toISOString()
      });
    }
    localStorage.setItem(key, JSON.stringify(saved));

    if (supabaseClient && userId) {
      try {
        await supabaseClient
          .from('user_saved_schemes')
          .upsert({
            user_id: userId,
            scheme_id: schemeId,
            status,
            liked: true
          });
      } catch (err) {
        console.warn('Supabase save scheme sync error:', err);
      }
    }
    return saved;
  },

  // Get user saved schemes
  async getUserSavedSchemes(userId) {
    if (supabaseClient && userId) {
      try {
        const { data, error } = await supabaseClient
          .from('user_saved_schemes')
          .select('*, schemes(*)')
          .eq('user_id', userId);
        if (data && !error && data.length > 0) return data;
      } catch (err) {
        console.info('Supabase saved schemes fetch note:', err?.message);
      }
    }

    const key = `schemematch_saved_${userId || 'guest'}`;
    const local = localStorage.getItem(key);
    if (local) {
      try {
        return JSON.parse(local);
      } catch (e) {}
    }

    // Default mock saved scheme matching the designs
    return [
      {
        id: 'save-1',
        scheme_id: 'ladki-bahin-yojana',
        status: 'approved_disbursing',
        app_id: 'APP-2024-MH-9482',
        liked: true,
        disbursements: [
          { period: 'August 2024', amount: '₹1,500', utr: 'UTR#8829104', status: 'Credited' },
          { period: 'July 2024', amount: '₹1,500', utr: 'UTR#7719203', status: 'Credited' }
        ]
      }
    ];
  }
};
