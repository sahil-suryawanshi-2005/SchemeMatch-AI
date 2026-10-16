// ==============================================================================
// SchemeMatch AI — Unified Navigation & Session Helper
// ==============================================================================

import { authService, dbService } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Check active session & restore name
  try {
    const session = await authService.getSession();
    const storedName = localStorage.getItem('schemematch_user_name');
    
    if (session?.user) {
      const email = session.user.email;
      let displayName = storedName || email.split('@')[0];

      try {
        const profile = await dbService.getProfile(session.user.id);
        if (profile?.full_name) {
          displayName = profile.full_name;
          localStorage.setItem('schemematch_user_name', displayName);
        }
      } catch (pErr) {
        console.warn('Profile fetch note in auth-nav:', pErr);
      }
      
      const nameElements = document.querySelectorAll('#display-user-name, #welcome-name, #header-user-name, .user-display-name');
      nameElements.forEach(el => {
        el.textContent = displayName;
      });
    }
  } catch (e) {
    console.warn('Session verification note:', e);
  }

  // Bind click handlers to all Sign Out buttons across the site
  const signOutButtons = document.querySelectorAll('a[title="Sign Out"], [data-action="sign-out"], #btn-sign-out');
  signOutButtons.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await authService.signOut();
      } catch (err) {
        console.warn('Sign out notice:', err);
      }
      window.location.href = 'index.html';
    });
  });
});

export { authService, dbService };
