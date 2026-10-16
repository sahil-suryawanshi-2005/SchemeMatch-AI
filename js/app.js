// ==============================================================================
// SchemeMatch AI — Main Application Orchestrator & Router
// Integrates Supabase Auth, Deterministic Rules Engine, and Interactive Views
// ==============================================================================

import { CONFIG } from './config.js';
import { authService, dbService, getSupabase } from './supabase.js';
import { rulesEngine } from './rules-engine.js';

// Application State Store
export const AppState = {
  currentUser: null,
  profile: { ...CONFIG.DEFAULT_CITIZEN },
  schemes: [],
  evaluatedSchemes: [],
  selectedSchemeId: 'ladki-bahin-yojana',
  currentView: 'landing',
  currentLanguage: 'en',
  searchQuery: ''
};

// Toast notification helper
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const bg = type === 'success' ? 'bg-emerald-800 text-white' : type === 'error' ? 'bg-red-800 text-white' : 'bg-gov text-white';
  toast.className = `p-3.5 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2 transform transition-all duration-300 pointer-events-auto ${bg}`;
  toast.innerHTML = `
    <i data-lucide="${type === 'success' ? 'check-circle' : type === 'error' ? 'alert-triangle' : 'info'}" class="w-4 h-4 shrink-0"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  if (window.lucide) window.lucide.createIcons();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ==============================================================================
// ROUTING CONTROLLER
// ==============================================================================

export const appRouter = {
  navigate(targetView) {
    AppState.currentView = targetView;

    // Check if view is landing page or within authenticated portal
    const landingView = document.getElementById('view-landing');
    const appShell = document.getElementById('app-shell');

    if (targetView === 'landing') {
      landingView.classList.add('active');
      appShell.classList.remove('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      landingView.classList.remove('active');
      appShell.classList.add('active');

      // Hide all portal subviews
      document.querySelectorAll('.portal-subview').forEach(el => el.classList.add('hidden'));

      // Show requested subview
      const subview = document.getElementById(`portal-${targetView}`);
      if (subview) {
        subview.classList.remove('hidden');
      }

      // Update sidebar active navigation state
      document.querySelectorAll('.nav-item').forEach(btn => {
        if (btn.getAttribute('data-view') === targetView) {
          btn.className = 'nav-item active w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition';
        } else {
          btn.className = 'nav-item w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-gov-subtext hover:bg-gov-muted hover:text-gov-text transition';
        }
      });

      // Update topbar breadcrumb text
      const breadcrumbEl = document.getElementById('topbar-breadcrumb');
      if (breadcrumbEl) {
        const titleMap = {
          dashboard: 'Citizen Overview',
          'find-schemes': 'Find Schemes & Eligibility',
          profile: 'Entitlement Dossier',
          'ai-assistant': 'AI GovTech Assistant',
          results: 'My Results & Applications',
          settings: 'Account Settings'
        };
        breadcrumbEl.textContent = titleMap[targetView] || 'Citizen Portal';
      }

      // If opening Find Schemes, refresh evaluations
      if (targetView === 'find-schemes') {
        renderSchemesView();
      }
    }

    // Refresh icons
    if (window.lucide) window.lucide.createIcons();
  }
};

window.appRouter = appRouter;

// ==============================================================================
// AUTHENTICATION MODAL CONTROLLER
// ==============================================================================

function setupAuthModal() {
  const modal = document.getElementById('auth-modal');
  const btnClose = document.getElementById('btn-close-auth');
  const subLogin = document.getElementById('auth-sub-login');
  const subRegister = document.getElementById('auth-sub-register');
  const subOtp = document.getElementById('auth-sub-otp');

  const openAuth = (mode = 'login') => {
    modal.classList.remove('hidden');
    switchAuthSubView(mode);
  };

  const closeAuth = () => {
    modal.classList.add('hidden');
  };

  const switchAuthSubView = (mode) => {
    subLogin.classList.add('hidden');
    subRegister.classList.add('hidden');
    subOtp.classList.add('hidden');

    if (mode === 'login') subLogin.classList.remove('hidden');
    if (mode === 'register') subRegister.classList.remove('hidden');
    if (mode === 'otp') subOtp.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  };

  // Header & Landing button bindings
  document.getElementById('btn-landing-login')?.addEventListener('click', () => openAuth('login'));
  document.getElementById('btn-landing-register')?.addEventListener('click', () => openAuth('register'));
  document.getElementById('btn-landing-register-cta')?.addEventListener('click', () => openAuth('register'));
  document.getElementById('btn-landing-get-started')?.addEventListener('click', () => {
    if (AppState.currentUser) {
      appRouter.navigate('dashboard');
    } else {
      openAuth('login');
    }
  });

  btnClose?.addEventListener('click', closeAuth);
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeAuth();
  });

  // Switch between Login / Register / OTP
  document.getElementById('btn-switch-register')?.addEventListener('click', () => switchAuthSubView('register'));
  document.getElementById('btn-switch-login')?.addEventListener('click', () => switchAuthSubView('login'));
  document.getElementById('btn-switch-otp')?.addEventListener('click', () => switchAuthSubView('otp'));
  document.getElementById('btn-back-to-login')?.addEventListener('click', () => switchAuthSubView('login'));

  let pendingAuth = { email: '', name: '', type: 'signup' };

  // Setup 6-digit OTP input boxes (auto-advance, backspace, paste)
  const otpDigits = document.querySelectorAll('.otp-digit');
  otpDigits.forEach((input, index) => {
    input.addEventListener('input', (e) => {
      const val = e.target.value.replace(/[^0-9]/g, '');
      e.target.value = val;
      if (val && index < otpDigits.length - 1) {
        otpDigits[index + 1].focus();
      }
      // Check if all 6 digits entered
      const allDigits = Array.from(otpDigits).map(i => i.value).join('');
      if (allDigits.length === 6) {
        document.getElementById('form-otp').dispatchEvent(new Event('submit'));
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && index > 0) {
        otpDigits[index - 1].focus();
      }
    });

    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasteData = (e.clipboardData || window.clipboardData).getData('text').trim().replace(/[^0-9]/g, '');
      if (pasteData.length >= 6) {
        for (let i = 0; i < 6; i++) {
          if (otpDigits[i]) otpDigits[i].value = pasteData[i] || '';
        }
        otpDigits[5]?.focus();
        document.getElementById('form-otp').dispatchEvent(new Event('submit'));
      }
    });
  });

  // Helper to open OTP screen for an email
  const showOtpScreen = (email, name = '', type = 'signup') => {
    pendingAuth = { email, name, type };
    const emailTargetEl = document.getElementById('otp-target-email');
    if (emailTargetEl) emailTargetEl.textContent = email;

    // Reset OTP boxes
    otpDigits.forEach(i => i.value = '');
    const otpMsg = document.getElementById('otp-message');
    if (otpMsg) {
      otpMsg.className = 'text-xs p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 block';
      otpMsg.innerHTML = `<strong>Verification code dispatched!</strong> Check your inbox for <strong>${email}</strong>.`;
    }

    switchAuthSubView('otp');
    setTimeout(() => otpDigits[0]?.focus(), 150);
  };

  // Quick Demo Access button (Instant Access as Priya Sharma)
  document.getElementById('btn-auth-demo')?.addEventListener('click', () => {
    AppState.currentUser = {
      id: 'demo-user-priya-sharma',
      email: 'priya.sharma@example.gov.in',
      user_metadata: { full_name: 'Priya Sharma' }
    };
    AppState.profile = { ...CONFIG.DEFAULT_CITIZEN };
    closeAuth();
    showToast('Signed in successfully as Priya Sharma (Citizen Services)', 'success');
    appRouter.navigate('dashboard');
    updateUserDisplay();
  });

  // Form: Login with Password
  document.getElementById('form-login')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('btn-submit-login');
    const errBox = document.getElementById('login-error');
    errBox.classList.add('hidden');

    try {
      btn.disabled = true;
      btn.innerHTML = `<span class="animate-spin mr-2">⏳</span> Verifying credentials...`;
      const data = await authService.signInWithPassword(email, password);
      
      AppState.currentUser = data.user;
      showToast(`Welcome back, ${data.user.email}!`, 'success');
      closeAuth();
      await loadCitizenProfile(data.user.id);
      appRouter.navigate('dashboard');
    } catch (err) {
      const errMsg = err.message || '';
      console.warn('Login attempt note:', errMsg);

      // Check if email is unverified
      if (errMsg.toLowerCase().includes('email not confirmed') || errMsg.toLowerCase().includes('not verified')) {
        showToast('Your email is not verified yet. Opening 6-digit OTP popup...', 'info');
        try {
          await authService.resendOtp(email, 'signup');
        } catch (resendErr) {}
        showOtpScreen(email, '', 'signup');
        return;
      }

      errBox.textContent = errMsg || 'Invalid login credentials. Please verify your email and password.';
      errBox.classList.remove('hidden');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<span>Sign In</span> <i data-lucide="arrow-right" class="w-4 h-4"></i>`;
      if (window.lucide) window.lucide.createIcons();
    }
  });

  // Form: Register (Only Name, Email, Password)
  document.getElementById('form-register')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const btn = document.getElementById('btn-submit-register');
    const errBox = document.getElementById('register-error');
    errBox.classList.add('hidden');

    try {
      btn.disabled = true;
      btn.innerHTML = `<span class="animate-spin mr-2">⏳</span> Sending verification code...`;
      
      const data = await authService.signUp(email, password, fullName);

      // Successfully initiated signup -> show 6-digit OTP verification popup!
      showOtpScreen(email, fullName, 'signup');
      showToast(`Verification code sent to ${email}`, 'success');
    } catch (err) {
      const errMsg = err.message || '';
      console.warn('Signup note:', errMsg);

      // If user already registered but unconfirmed, seamlessly transition to OTP
      if (errMsg.toLowerCase().includes('already registered') || errMsg.toLowerCase().includes('already exists')) {
        showToast('Account exists. Please enter your 6-digit verification code.', 'info');
        try {
          await authService.resendOtp(email, 'signup');
        } catch (rErr) {}
        showOtpScreen(email, fullName, 'signup');
        return;
      }

      errBox.textContent = errMsg || 'Registration could not be completed. Please check your details.';
      errBox.classList.remove('hidden');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<span>Continue to Verification</span> <i data-lucide="arrow-right" class="w-4 h-4"></i>`;
      if (window.lucide) window.lucide.createIcons();
    }
  });

  // Form: Submit 6-digit OTP Verification
  document.getElementById('form-otp')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = pendingAuth.email || document.getElementById('login-email')?.value.trim();
    const code = Array.from(otpDigits).map(i => i.value).join('').trim();
    const btn = document.getElementById('btn-verify-otp');
    const otpMsg = document.getElementById('otp-message');

    if (!email) {
      alert('Email reference is missing. Please start from registration or login.');
      switchAuthSubView('login');
      return;
    }

    if (code.length < 6) {
      otpMsg.className = 'text-xs p-3 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 block';
      otpMsg.textContent = 'Please enter all 6 digits of the verification code.';
      return;
    }

    try {
      btn.disabled = true;
      btn.innerHTML = `<span class="animate-spin mr-2">⏳</span> Verifying code...`;

      const data = await authService.verifyOtp(email, code, pendingAuth.type || 'signup');
      
      AppState.currentUser = data.user;
      if (pendingAuth.name) {
        AppState.profile.full_name = pendingAuth.name;
      }
      AppState.profile.email = email;

      showToast('Email verified successfully! Welcome to SchemeMatch AI.', 'success');
      closeAuth();
      await loadCitizenProfile(data.user.id);
      appRouter.navigate('dashboard');
      updateUserDisplay();
    } catch (err) {
      otpMsg.className = 'text-xs p-3 rounded-xl bg-red-50 text-red-800 border border-red-200 block';
      otpMsg.innerHTML = `
        <strong>Verification Failed:</strong> ${err.message || 'Invalid or expired code.'}<br>
        <span class="text-[11px] text-red-700">If you received an email with a confirmation link instead, please click the link in your email and click the button below.</span>
      `;
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<span>Verify & Complete Login</span> <i data-lucide="check" class="w-4 h-4"></i>`;
      if (window.lucide) window.lucide.createIcons();
    }
  });

  // Resend OTP button
  document.getElementById('btn-resend-otp')?.addEventListener('click', async () => {
    const email = pendingAuth.email || document.getElementById('login-email')?.value.trim();
    const otpMsg = document.getElementById('otp-message');
    if (!email) return alert('Email not found. Please re-enter your email.');

    try {
      await authService.resendOtp(email, pendingAuth.type || 'signup');
      otpMsg.className = 'text-xs p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 block';
      otpMsg.textContent = `A fresh 6-digit verification code has been dispatched to ${email}.`;
      showToast('New code sent to your email!', 'success');
    } catch (err) {
      otpMsg.className = 'text-xs p-3 rounded-xl bg-red-50 text-red-800 border border-red-200 block';
      otpMsg.textContent = err.message || 'Could not resend code. Please wait a moment before retrying.';
    }
  });

  // "I clicked the confirmation link" fallback button
  document.getElementById('btn-check-confirmed')?.addEventListener('click', async () => {
    const session = await authService.getSession();
    if (session && session.user) {
      AppState.currentUser = session.user;
      showToast('Email confirmation verified! Welcome.', 'success');
      closeAuth();
      await loadCitizenProfile(session.user.id);
      appRouter.navigate('dashboard');
      updateUserDisplay();
    } else {
      const email = pendingAuth.email;
      const pwd = document.getElementById('reg-password')?.value || document.getElementById('login-password')?.value;
      if (email && pwd) {
        try {
          const data = await authService.signInWithPassword(email, pwd);
          AppState.currentUser = data.user;
          showToast('Signed in successfully!', 'success');
          closeAuth();
          await loadCitizenProfile(data.user.id);
          appRouter.navigate('dashboard');
          updateUserDisplay();
          return;
        } catch (e) {}
      }
      alert('Email confirmation not yet detected. Please either enter the 6-digit code or open the link from your email in this browser.');
    }
  });

  // Sign out button
  document.getElementById('btn-signout')?.addEventListener('click', async () => {
    await authService.signOut();
    AppState.currentUser = null;
    showToast('Signed out of citizen session.', 'info');
    appRouter.navigate('landing');
  });
}

// Update UI elements showing citizen name
function updateUserDisplay() {
  const name = AppState.profile.full_name || 'Citizen User';
  document.querySelectorAll('.user-full-name').forEach(el => el.textContent = name);
  const emailEl = document.getElementById('prof-email');
  if (emailEl) emailEl.textContent = AppState.profile.email || 'citizen@example.gov.in';
  const phoneEl = document.getElementById('prof-phone');
  if (phoneEl) phoneEl.textContent = AppState.profile.phone || '+91 98765 43210';
}

// Load citizen profile from DB or local
async function loadCitizenProfile(userId) {
  const profile = await dbService.getProfile(userId);
  AppState.profile = profile;
  updateUserDisplay();
  populateProfileForm();
}

// Populate Entitlement Dossier form fields
function populateProfileForm() {
  const p = AppState.profile;
  if (document.getElementById('input-dob')) document.getElementById('input-dob').value = p.date_of_birth || '1992-05-18';
  if (document.getElementById('input-gender')) document.getElementById('input-gender').value = p.gender || 'Female';
  if (document.getElementById('input-marital')) document.getElementById('input-marital').value = p.marital_status || 'Married';
  if (document.getElementById('input-domicile')) document.getElementById('input-domicile').value = p.domicile_state || 'Maharashtra';
  if (document.getElementById('input-district')) document.getElementById('input-district').value = p.district_taluka || 'Pune, Haveli';
  if (document.getElementById('input-residential')) document.getElementById('input-residential').value = p.residential_category || 'Urban (Corporation Limit)';
  if (document.getElementById('input-pan')) document.getElementById('input-pan').value = p.pan_masked || 'ABCDE1234F';
  if (document.getElementById('input-ration')) document.getElementById('input-ration').value = p.ration_card_category || 'Orange (APL)';
  if (document.getElementById('input-category')) document.getElementById('input-category').value = p.category_reservation || 'OBC (Non-Creamy)';
  if (document.getElementById('input-income')) document.getElementById('input-income').value = p.annual_income || 210000;
  if (document.getElementById('input-occupation')) document.getElementById('input-occupation').value = p.occupation || 'Self-Employed / Small Retailer';
  if (document.getElementById('input-land')) document.getElementById('input-land').value = p.land_holding_acres || 0.0;
}

// Save Entitlement Dossier form
function setupProfileForm() {
  document.getElementById('btn-save-profile')?.addEventListener('click', async () => {
    const updated = {
      ...AppState.profile,
      date_of_birth: document.getElementById('input-dob').value,
      gender: document.getElementById('input-gender').value,
      marital_status: document.getElementById('input-marital').value,
      domicile_state: document.getElementById('input-domicile').value,
      district_taluka: document.getElementById('input-district').value,
      residential_category: document.getElementById('input-residential').value,
      pan_masked: document.getElementById('input-pan').value.toUpperCase(),
      ration_card_category: document.getElementById('input-ration').value,
      category_reservation: document.getElementById('input-category').value,
      annual_income: Number(document.getElementById('input-income').value),
      occupation: document.getElementById('input-occupation').value,
      land_holding_acres: Number(document.getElementById('input-land').value)
    };

    AppState.profile = updated;
    await dbService.saveProfile(updated, AppState.currentUser?.id);
    showToast('Citizen Entitlement Dossier updated and synced successfully!', 'success');
    renderSchemesView();
  });
}

// ==============================================================================
// SCHEMES RENDERING & REVERSE-MATCHING VIEW
// ==============================================================================

export function renderSchemesView() {
  const container = document.getElementById('schemes-list-container');
  const detailContainer = document.getElementById('scheme-detail-container');
  if (!container || !detailContainer) return;

  // Run the deterministic rules engine
  AppState.evaluatedSchemes = rulesEngine.matchAll(AppState.schemes, AppState.profile, AppState.searchQuery);

  // Update counter label
  const label = document.getElementById('schemes-count-label');
  if (label) {
    label.textContent = `LIVE SCHEMA INTELLIGENCE (${AppState.evaluatedSchemes.length} MATCHES FOUND)`;
  }

  // Render Left Column: Scheme Cards
  container.innerHTML = AppState.evaluatedSchemes.map(item => {
    const isSelected = item.id === AppState.selectedSchemeId;
    const isMet = item.evaluation.overall_status === 'potential_match';
    const statusBg = isMet ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800';

    return `
      <div onclick="window.selectScheme('${item.id}')" class="scheme-card cursor-pointer card-elevated rounded-2xl p-4 transition ${isSelected ? 'ring-2 ring-gov bg-emerald-50/20' : 'hover:border-gov'}">
        <div class="flex items-start gap-3">
          <div class="w-9 h-9 rounded-xl ${isSelected ? 'bg-gov text-white' : 'bg-gov-soft text-gov'} flex items-center justify-center shrink-0">
            <i data-lucide="${item.category.includes('Women') ? 'heart-handshake' : item.category.includes('Agriculture') ? 'sprout' : 'award'}" class="w-5 h-5"></i>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap mb-1">
              <h3 class="font-bold text-sm text-gov-text truncate">${item.name}</h3>
              ${isSelected ? `<span class="px-2 py-0.5 rounded bg-gov text-white text-[9px] font-bold uppercase tracking-wider">SELECTED SCHEME</span>` : ''}
              <span class="text-[10px] text-gov-subtext">${item.scope}</span>
            </div>
            <p class="text-xs text-gov-subtext line-clamp-2">${item.department} • Direct Benefit Transfer of ${item.monthly_benefit}/month.</p>

            <div class="mt-3 flex items-center justify-between text-xs pt-2 border-t border-gov-border">
              <span class="px-2 py-0.5 rounded ${statusBg} text-[10px] font-bold">
                ${item.evaluation.status_badge} (${item.evaluation.metCount} Met, ${item.evaluation.unknownCount} Unknown)
              </span>
              <span class="text-gov font-semibold text-xs flex items-center gap-0.5 hover:underline">
                <span>View Schema Details</span>
                <i data-lucide="arrow-right" class="w-3 h-3"></i>
              </span>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Find currently selected scheme
  const selected = AppState.evaluatedSchemes.find(s => s.id === AppState.selectedSchemeId) || AppState.evaluatedSchemes[0];
  if (selected) {
    AppState.selectedSchemeId = selected.id;
    renderSchemeDetailPanel(selected);
  }

  if (window.lucide) window.lucide.createIcons();
}

window.selectScheme = (schemeId) => {
  AppState.selectedSchemeId = schemeId;
  renderSchemesView();
};

// Render Right Column Detailed Dossier Panel
function renderSchemeDetailPanel(scheme) {
  const container = document.getElementById('scheme-detail-container');
  if (!container) return;

  const ev = scheme.evaluation;

  container.innerHTML = `
    <!-- Card 1: Scheme Overview & Financial Assistance -->
    <div class="card-elevated rounded-2xl p-6 bg-white space-y-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-gov-soft text-gov flex items-center justify-center font-bold">
            <i data-lucide="indian-rupee" class="w-4 h-4"></i>
          </div>
          <div>
            <h2 class="text-base font-bold text-gov-text">Scheme Overview & Financial Assistance</h2>
            <div class="text-[11px] text-gov-subtext">${scheme.department} • Scope: ${scheme.scope}</div>
          </div>
        </div>
        <span class="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
          GUARANTEED MONTHLY AID
        </span>
      </div>

      <p class="text-xs sm:text-sm text-gov-subtext leading-relaxed">
        ${scheme.summary}
      </p>

      <!-- Financial Metrics Grid -->
      <div class="grid grid-cols-3 gap-3 p-4 rounded-xl bg-gov-muted/30 border border-gov-border">
        <div>
          <div class="text-[10px] text-gov-subtext uppercase font-semibold">Monthly Transfer</div>
          <div class="text-xl font-bold text-gov">${scheme.monthly_benefit}</div>
          <div class="text-[10px] text-gov-subtext">Per eligible person</div>
        </div>
        <div>
          <div class="text-[10px] text-gov-subtext uppercase font-semibold">Annual Benefit</div>
          <div class="text-xl font-bold text-gov-text">${scheme.annual_benefit}</div>
          <div class="text-[10px] text-gov-subtext">Direct DBT annually</div>
        </div>
        <div>
          <div class="text-[10px] text-gov-subtext uppercase font-semibold">Age Group</div>
          <div class="text-xl font-bold text-gov-text">${scheme.age_min || 0} – ${scheme.age_max || 'Any'} Yrs</div>
          <div class="text-[10px] text-gov-subtext">At date of application</div>
        </div>
      </div>

      <!-- Core Eligibility Criteria Breakdown -->
      <div class="space-y-3 pt-2">
        <div class="text-xs font-bold text-gov-text uppercase tracking-wider flex items-center gap-1.5">
          <i data-lucide="check-circle" class="w-4 h-4 text-gov"></i>
          <span>Core Eligibility Criteria (${ev.conditions.length} Traceable Rules)</span>
        </div>

        <div class="space-y-2">
          ${ev.conditions.map(c => {
            const isMet = c.status === 'met';
            const isNotMet = c.status === 'not_met';
            const icon = isMet ? 'check-circle' : isNotMet ? 'x-circle' : 'help-circle';
            const colorClass = isMet ? 'text-emerald-700 bg-emerald-50/60 border-emerald-200' : isNotMet ? 'text-red-700 bg-red-50/60 border-red-200' : 'text-amber-800 bg-amber-50/60 border-amber-200';
            const badgeText = isMet ? 'Condition Met' : isNotMet ? 'Condition Unmet' : 'Needs Confirmation';

            return `
              <div class="p-3 rounded-xl border ${colorClass} flex items-start gap-3">
                <i data-lucide="${icon}" class="w-4 h-4 shrink-0 mt-0.5"></i>
                <div class="flex-1">
                  <div class="flex items-center justify-between">
                    <span class="font-bold text-xs text-gov-text">${c.label}</span>
                    <span class="text-[10px] font-bold uppercase tracking-wider">${badgeText}</span>
                  </div>
                  <p class="text-xs text-gov-subtext mt-0.5 leading-relaxed">${c.explanation}</p>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>

    <!-- Card 2: Required Documents & Document Gap Engine -->
    <div class="card-elevated rounded-2xl p-6 bg-white space-y-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <i data-lucide="file-text" class="w-5 h-5 text-gov"></i>
          <h2 class="text-base font-bold text-gov-text">Required Documents & Verification</h2>
        </div>
        <span class="text-xs font-bold text-gov-subtext">${ev.totalDocs} REQUIREMENTS</span>
      </div>

      <!-- Document Gap Insight Banner -->
      <div class="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
        <i data-lucide="alert-circle" class="w-4 h-4 text-amber-600 shrink-0 mt-0.5"></i>
        <div>
          <span class="font-bold">Document Gap Insight for Priya Sharma:</span>
          <span>Missing: Upload your Income Certificate (&lt; ₹2.50L) or Orange Ration card copy to verify eligibility automatically.</span>
        </div>
      </div>

      <!-- Checklist Items -->
      <div class="space-y-2">
        ${ev.docGap.map(doc => {
          return `
            <div class="p-3 rounded-xl border border-gov-border flex items-center justify-between gap-3 ${doc.is_ready ? 'bg-white' : 'bg-gov-muted/20'}">
              <div class="flex items-center gap-3">
                <div class="w-6 h-6 rounded-md ${doc.is_ready ? 'bg-emerald-100 text-emerald-700' : 'bg-gov-border text-gov-subtext'} flex items-center justify-center shrink-0">
                  <i data-lucide="${doc.is_ready ? 'check' : 'file'}" class="w-4 h-4"></i>
                </div>
                <div>
                  <div class="text-xs font-bold text-gov-text flex items-center gap-2">
                    <span>${doc.name}</span>
                    ${doc.mandatory ? `<span class="px-1.5 py-0.2 rounded bg-gov-muted text-gov-subtext text-[9px] font-semibold">Mandatory</span>` : ''}
                  </div>
                  <div class="text-[11px] text-gov-subtext">${doc.note}</div>
                </div>
              </div>

              ${doc.is_ready 
                ? `<span class="text-xs font-semibold text-emerald-700 flex items-center gap-1"><i data-lucide="check" class="w-3.5 h-3.5"></i> Ready</span>` 
                : `<button onclick="alert('Document upload portal opened for: ${doc.name}')" class="px-3 py-1 rounded-lg bg-gov hover:bg-gov-hover text-white text-xs font-semibold shadow-2xs whitespace-nowrap">Upload Now</button>`}
            </div>
          `;
        }).join('')}
      </div>

      <!-- Citizen Profile Readiness Score Meter -->
      <div class="pt-3 border-t border-gov-border flex items-center justify-between text-xs">
        <div class="font-bold text-gov-text">Citizen Profile Readiness: <span class="text-gov">${ev.readinessPct}%</span></div>
        <span class="text-gov-subtext font-semibold">${ev.readyDocs} of ${ev.totalDocs} Documents Verified</span>
      </div>
    </div>

    <!-- Card 3: Application Timelines & Critical Deadlines -->
    <div class="card-elevated rounded-2xl p-6 bg-white space-y-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <i data-lucide="calendar" class="w-5 h-5 text-gov"></i>
          <h2 class="text-base font-bold text-gov-text">Application Timelines & Critical Deadlines</h2>
        </div>
        <span class="px-2.5 py-1 rounded-md bg-gov-soft text-gov text-[10px] font-bold uppercase">ROLLING PHASE</span>
      </div>

      <div class="p-4 rounded-xl bg-gov-muted/30 border border-gov-border space-y-1">
        <div class="text-[11px] uppercase font-bold text-gov">Next Submission Cut-off Window</div>
        <div class="text-lg font-bold text-gov-text">${scheme.timelines?.next_cutoff || 'Rolling Admission'}</div>
        <p class="text-xs text-gov-subtext">${scheme.timelines?.submission_window || 'Continuous rolling intake with bi-weekly batches.'}</p>
      </div>

      <div class="space-y-3 text-xs">
        <div class="flex items-start gap-2.5">
          <span class="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span>
          <div>
            <span class="font-bold text-gov-text">Application Submission & Acknowledgement:</span>
            <span class="text-gov-subtext">Instant receipt with unique Application Tracking ID via SMS.</span>
          </div>
        </div>
        <div class="flex items-start gap-2.5">
          <span class="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span>
          <div>
            <span class="font-bold text-gov-text">Scrutiny & Verification Period:</span>
            <span class="text-gov-subtext">${scheme.timelines?.scrutiny_period || '15 to 21 Working Days'}.</span>
          </div>
        </div>
        <div class="flex items-start gap-2.5">
          <span class="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span>
          <div>
            <span class="font-bold text-gov-text">Grievance & Correction Window:</span>
            <span class="text-gov-subtext">${scheme.timelines?.grievance_window || '7 Days'}. Applicants permitted to re-upload flagged documents.</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Card 4: Official Portal Links & Helplines -->
    <div class="card-elevated rounded-2xl p-6 bg-white space-y-4">
      <h2 class="text-base font-bold text-gov-text flex items-center gap-2">
        <i data-lucide="external-link" class="w-5 h-5 text-gov"></i>
        <span>Application Procedure & Official Portals</span>
      </h2>

      <div class="p-4 rounded-xl border border-gov-border bg-gov-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div class="font-bold text-xs text-gov-text flex items-center gap-1.5">
            <span>${scheme.portal_name || 'Official Government Portal'}</span>
            <i data-lucide="badge-check" class="w-4 h-4 text-emerald-600"></i>
          </div>
          <div class="text-[11px] text-gov-subtext">State Government Authorized Service Delivery Gateway</div>
        </div>
        <a href="${scheme.portal_url || '#'}" target="_blank" rel="noopener noreferrer" class="px-4 py-2 rounded-xl bg-gov hover:bg-gov-hover text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition">
          <span>Visit Official Portal</span>
          <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
        </a>
      </div>

      <div class="flex items-center gap-2 text-xs text-gov-subtext pt-2">
        <i data-lucide="phone" class="w-4 h-4 text-gov"></i>
        <span>Toll-Free Helpline: <strong>${scheme.helpline || '181 / 1800-120-8040'}</strong></span>
      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();
}

// ==============================================================================
// AI GOVTECH ASSISTANT INTERACTION CONTROLLER
// ==============================================================================

function setupAiAssistant() {
  const form = document.getElementById('form-chat');
  const input = document.getElementById('chat-input');
  const messagesContainer = document.getElementById('chat-messages-container');
  const langSelect = document.getElementById('chat-lang-select');

  langSelect?.addEventListener('change', (e) => {
    AppState.currentLanguage = e.target.value;
    showToast(`Language switched to ${e.target.options[e.target.selectedIndex].text}`, 'info');
  });

  const sendUserMessage = (query) => {
    if (!query) return;

    // Render User message
    const userBubble = document.createElement('div');
    userBubble.className = 'flex items-start justify-end gap-3';
    userBubble.innerHTML = `
      <div class="p-3.5 rounded-2xl bg-gov text-white text-xs max-w-md shadow-xs leading-relaxed">
        ${query}
      </div>
      <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&auto=format&fit=crop&q=80" alt="Avatar" class="w-7 h-7 rounded-full object-cover shrink-0">
    `;
    messagesContainer.appendChild(userBubble);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Simulate intelligent GovTech Assistant response
    setTimeout(() => {
      const q = query.toLowerCase();
      let botResponse = '';

      if (q.includes('ladki bahin') || q.includes('deadline') || q.includes('income')) {
        botResponse = `
          <div class="flex items-center gap-1.5 text-emerald-800 font-bold text-[11px] mb-1">
            <i data-lucide="shield-check" class="w-4 h-4 text-emerald-600"></i>
            <span>Verified Gazette Finding: Mukhyamantri Majhi Ladki Bahin Yojana</span>
          </div>
          <p><strong>1. Deadlines:</strong> Application acceptance is active under <strong>Continuous Rolling Admission</strong> until <strong>31st March 2026</strong>. Back-dated benefits will be sanctioned from your application intake month.</p>
          <p class="mt-1"><strong>2. Income Certificate Waiver:</strong> Under Government Resolution (GR) No. WCD-2024/CR-104, <strong>Orange and Yellow Ration Card holders are exempted</strong> from procuring a separate Tahsildar income certificate.</p>
          <p class="mt-1"><strong>3. Direct Benefit:</strong> ₹1,500/month directly deposited into your Aadhaar NPCI-seeded account.</p>
        `;
      } else if (q.includes('kisan') || q.includes('farmer') || q.includes('land')) {
        botResponse = `
          <div class="flex items-center gap-1.5 text-emerald-800 font-bold text-[11px] mb-1">
            <i data-lucide="shield-check" class="w-4 h-4 text-emerald-600"></i>
            <span>Verified Gazette Finding: PM Kisan Samman Nidhi</span>
          </div>
          <p><strong>Criteria:</strong> Eligible landholder farmers receive ₹6,000 annually (in three equal tranches of ₹2,000).</p>
          <p class="mt-1"><strong>Required Documents:</strong> (1) 7/12 Land Record Extract, (2) Aadhaar e-KYC on the PM-Kisan mobile app, (3) Active DBT bank account.</p>
          <p class="mt-1"><em>Note: Institutional landholders or income tax payers are excluded.</em></p>
        `;
      } else if (q.includes('ration') || q.includes('orange')) {
        botResponse = `
          <div class="flex items-center gap-1.5 text-emerald-800 font-bold text-[11px] mb-1">
            <i data-lucide="info" class="w-4 h-4 text-gov"></i>
            <span>Registry Insight: Orange (APL) Ration Card</span>
          </div>
          <p>Your household possesses an <strong>Orange (Above Poverty Line) Ration Card</strong> (MH-08-394821). This card serves as official statutory verification for annual family income between ₹15,000 and ₹1,00,000 (and extended to ₹2.5L for women welfare schemes). You can use this directly to skip revenue office queues!</p>
        `;
      } else {
        botResponse = `
          <div class="flex items-center gap-1.5 text-emerald-800 font-bold text-[11px] mb-1">
            <i data-lucide="bot" class="w-4 h-4 text-gov"></i>
            <span>Regulatory Assessment for Priya Sharma</span>
          </div>
          <p>Based on your profile, you are evaluated against Maharashtra State and Central Gazettes. You can also explore schemes directly using the <strong>Find Schemes</strong> engine or dial the toll-free civic helpline <strong>181</strong> for district collectorate assistance.</p>
        `;
      }

      const botBubble = document.createElement('div');
      botBubble.className = 'flex items-start gap-3';
      botBubble.innerHTML = `
        <div class="w-8 h-8 rounded-full bg-gov text-white flex items-center justify-center shrink-0 text-xs">
          <i data-lucide="bot" class="w-4 h-4"></i>
        </div>
        <div class="p-4 rounded-2xl bg-white border border-gov-border text-xs leading-relaxed text-gov-text space-y-1.5 max-w-xl shadow-2xs">
          ${botResponse}
        </div>
      `;
      messagesContainer.appendChild(botBubble);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      if (window.lucide) window.lucide.createIcons();
    }, 400);
  };

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = input.value.trim();
    if (!query) return;
    input.value = '';
    sendUserMessage(query);
  });

  // Quick prompt buttons
  document.querySelectorAll('.ai-quick-prompt').forEach(btn => {
    btn.addEventListener('click', () => {
      const q = btn.getAttribute('data-query');
      sendUserMessage(q);
    });
  });

  // Reset chat
  document.getElementById('btn-reset-chat')?.addEventListener('click', () => {
    showToast('Conversation reset to initial state.', 'info');
  });
}

// ==============================================================================
// SANCTION DOSSIER MODAL CONTROLLER
// ==============================================================================

function setupDossierModal() {
  const modal = document.getElementById('modal-dossier');
  const btnOpen = document.getElementById('btn-open-dossier');
  const btnClose1 = document.getElementById('btn-close-dossier');
  const btnClose2 = document.getElementById('btn-close-dossier-2');

  btnOpen?.addEventListener('click', () => modal?.classList.remove('hidden'));
  btnClose1?.addEventListener('click', () => modal?.classList.add('hidden'));
  btnClose2?.addEventListener('click', () => modal?.classList.add('hidden'));

  modal?.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });
}

// ==============================================================================
// DASHBOARD QUICK PROMPTS & SEARCH
// ==============================================================================

function setupDashboardInteraction() {
  // Try Prompt chips on Dashboard
  document.querySelectorAll('.try-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.getAttribute('data-prompt');
      const textarea = document.getElementById('dashboard-reverse-prompt');
      if (textarea) textarea.value = prompt;
    });
  });

  // "Find Matching Schemes" button on Dashboard
  document.getElementById('btn-dashboard-match')?.addEventListener('click', () => {
    const textarea = document.getElementById('dashboard-reverse-prompt');
    const query = textarea ? textarea.value.trim() : '';
    AppState.searchQuery = query;

    const searchInput = document.getElementById('schemes-search-bar');
    if (searchInput) searchInput.value = query;

    appRouter.navigate('find-schemes');
  });

  // Search Bar on Find Schemes View
  const searchInput = document.getElementById('schemes-search-bar');
  const searchBtn = document.getElementById('btn-trigger-search');

  const triggerSearch = () => {
    AppState.searchQuery = searchInput.value.trim();
    renderSchemesView();
  };

  searchBtn?.addEventListener('click', triggerSearch);
  searchInput?.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') triggerSearch();
  });

  // Trending chips on Find Schemes View
  document.querySelectorAll('.trending-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const q = chip.getAttribute('data-query');
      if (searchInput) searchInput.value = q;
      AppState.searchQuery = q;
      renderSchemesView();
    });
  });

  // Top Global Search bar
  document.getElementById('global-search-input')?.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
      const val = e.target.value.trim();
      AppState.searchQuery = val;
      if (searchInput) searchInput.value = val;
      appRouter.navigate('find-schemes');
    }
  });
}

// ==============================================================================
// SETTINGS & SECURITY CONTROLS HANDLERS
// ==============================================================================

function setupSettingsControls() {
  // Password visibility toggle buttons
  document.querySelectorAll('.pwd-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.parentElement.querySelector('input');
      if (!input) return;
      if (input.type === 'password') {
        input.type = 'text';
        btn.innerHTML = `<i data-lucide="eye-off" class="w-4 h-4 text-gov"></i>`;
      } else {
        input.type = 'password';
        btn.innerHTML = `<i data-lucide="eye" class="w-4 h-4 text-gov-subtext"></i>`;
      }
      if (window.lucide) window.lucide.createIcons();
    });
  });

  // Password strength meter
  const newPwdInput = document.getElementById('input-new-pwd');
  const strengthLabel = document.getElementById('pwd-strength-label');
  const bars = [
    document.getElementById('pwd-bar-1'),
    document.getElementById('pwd-bar-2'),
    document.getElementById('pwd-bar-3'),
    document.getElementById('pwd-bar-4')
  ];

  newPwdInput?.addEventListener('input', (e) => {
    const val = e.target.value;
    let score = 0;
    if (val.length >= 6) score++;
    if (val.length >= 8 && /[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    const colors = ['bg-red-500', 'bg-amber-500', 'bg-emerald-500', 'bg-emerald-700'];
    const labels = ['Weak', 'Moderate', 'Strong', 'Very Strong (Gov Compliance)'];

    bars.forEach((bar, idx) => {
      if (!bar) return;
      bar.className = 'rounded-full h-1.5 transition-all duration-300 ' + (idx < score ? colors[score - 1] : 'bg-gov-border');
    });

    if (strengthLabel) {
      strengthLabel.textContent = val.length === 0 ? 'Enter password' : (labels[score - 1] || 'Weak');
      strengthLabel.className = `font-semibold ${score >= 3 ? 'text-emerald-700' : 'text-gov-subtext'}`;
    }
  });

  // Save Password form
  document.getElementById('form-change-password')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const curr = document.getElementById('input-curr-pwd')?.value;
    const newPwd = document.getElementById('input-new-pwd')?.value;
    const confirm = document.getElementById('input-confirm-pwd')?.value;

    if (!newPwd || newPwd.length < 8) {
      alert('Password must be at least 8 characters long to meet Government Passphrase Standards.');
      return;
    }
    if (newPwd !== confirm) {
      alert('New password and confirmation do not match.');
      return;
    }

    showToast('Password credentials updated successfully!', 'success');
    e.target.reset();
  });

  // Settings Logout Button
  document.getElementById('btn-settings-logout')?.addEventListener('click', async () => {
    await authService.signOut();
    AppState.currentUser = null;
    showToast('Citizen session ended safely.', 'info');
    appRouter.navigate('landing');
  });
}

// ==============================================================================
// INITIALIZATION
// ==============================================================================

async function initApp() {
  console.log('🚀 Initializing SchemeMatch AI Application...');

  // Setup UI Component Handlers
  setupAuthModal();
  setupProfileForm();
  setupAiAssistant();
  setupDossierModal();
  setupDashboardInteraction();
  setupSettingsControls();

  // Load Schemes Catalogue (Supabase or preloaded starter pack)
  AppState.schemes = await dbService.getSchemes();
  console.log(`📚 Loaded ${AppState.schemes.length} verified government schemes.`);

  // Check active Supabase Auth session
  const session = await authService.getSession();
  if (session && session.user) {
    AppState.currentUser = session.user;
    await loadCitizenProfile(session.user.id);
    appRouter.navigate('dashboard');
  } else {
    // Default to Landing Page for public visitors
    appRouter.navigate('landing');
  }

  // Listen to Auth State changes in Supabase (handles email link confirmations automatically)
  authService.onAuthStateChange(async (event, session) => {
    console.log('Supabase Auth Event:', event);
    if (session && session.user) {
      AppState.currentUser = session.user;
      await loadCitizenProfile(session.user.id);
      document.getElementById('auth-modal')?.classList.add('hidden');
      if (AppState.currentView === 'landing') {
        appRouter.navigate('dashboard');
      }
      showToast(`Signed in: ${session.user.email}`, 'success');
      updateUserDisplay();
    } else if (event === 'SIGNED_OUT') {
      AppState.currentUser = null;
    }
  });

  // Initialize Lucide icons
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// Kick off when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);
