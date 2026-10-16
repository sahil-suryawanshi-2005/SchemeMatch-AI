# SchemeMatch AI --- Authentication Setup (`autth.md`)

## 1. Purpose

This document describes the current authentication setup for SchemeMatch
AI: email-based one-time password (OTP) verification using Supabase
Auth, custom email delivery through Resend SMTP, and the user profile
data that should be stored after authentication.

**Current implementation goal:** a user enters their email address,
receives a one-time code by email, enters the code, and is signed in
after successful verification.

> Important: the email OTP flow is the confirmed authentication
> approach. Password-based login, SMS OTP, Aadhaar/NIC/DigiLocker
> sign-in, and government identity verification are not currently
> configured as real authentication providers. UI mockups may show these
> concepts, but they must not be presented as working integrations
> unless separately implemented and verified.

------------------------------------------------------------------------

## 2. Authentication Architecture

-   **Frontend:** website UI built by the team. A temporary standalone
    HTML page was used to test the OTP flow.
-   **Authentication provider:** Supabase Auth.
-   **Email delivery:** Resend through custom SMTP configured in
    Supabase.
-   **Client library:** `@supabase/supabase-js` v2.
-   **Database:** Supabase Postgres, with a user profile table linked to
    Supabase Auth users.
-   **Expected flow:** email entry → request OTP → email received → OTP
    entry → verify OTP → signed-in session → load that user's profile.

### Credentials and secrets

The browser/client may use: - Supabase project URL. - Supabase
**publishable** key (`sb_publishable_...`).

Never place any of the following in frontend code, GitHub, screenshots,
or public documentation: - Supabase secret key (`sb_secret_...`). -
Resend API key / SMTP password. - Any service-role key or other
privileged server secret.

Use environment variables for secrets on the backend. If a secret has
already been exposed, rotate it immediately.

------------------------------------------------------------------------

## 3. Supabase Project

-   **Project name:** `Schemematch` (the project name may appear with
    different capitalization in the dashboard).
-   **Region:** South Asia (Mumbai).
-   **Project URL:** copy the exact URL from the Supabase dashboard's
    **Connect** dialog or project API settings. Do not guess the project
    ID or manually invent the URL.
-   **Client library:** `@supabase/supabase-js` v2.

Install the library in the frontend project if it is not already
installed:

``` bash
npm install @supabase/supabase-js
```

Example client initialization:

``` js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey
);
```

For Vite, the corresponding `.env` file can contain:

``` env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_REPLACE_WITH_YOUR_KEY
```

Replace the example values with the actual project URL and publishable
key. Do not commit a real secret key. A Supabase publishable key is
intended for client-side use, but database access must still be
protected with Row Level Security (RLS).

Add `.env` to `.gitignore` if it is not already there.

------------------------------------------------------------------------

## 4. Email OTP Flow

### Step A --- Request an OTP

Call `signInWithOtp` when the user submits their email:

``` js
const { error } = await supabase.auth.signInWithOtp({
  email,
  options: {
    shouldCreateUser: true
  }
});

if (error) {
  // Show a useful message in the UI; do not pretend the email was sent.
  throw error;
}
```

-   `shouldCreateUser: true` allows Supabase to create an Auth user when
    the email is not already registered.
-   For a registration form, collect the user's name separately and save
    it to the profile after authentication succeeds.
-   Do not store the OTP in the database or log it.
-   Display a neutral message such as: "If the address can receive a
    sign-in code, check your email."
-   Disable the send button while the request is processing and apply a
    sensible resend cooldown in the UI.

### Step B --- Verify the OTP

The user enters the code received by email:

``` js
const { data, error } = await supabase.auth.verifyOtp({
  email,
  token: otp,
  type: 'email'
});

if (error) {
  // Show an error and allow a careful retry.
  throw error;
}

// A successful verification should establish a Supabase session.
const user = data.user;
const session = data.session;
```

After successful verification: 1. Confirm that `data.user` exists. 2.
Save or update the user's profile using the authenticated user's ID. 3.
Fetch only that user's profile. 4. Navigate to the authenticated
dashboard. 5. Keep the session handling managed by Supabase Auth; do not
invent a separate client-side authentication flag as the source of
truth.

### Step C --- Sign out

``` js
const { error } = await supabase.auth.signOut();
if (error) throw error;
```

After signing out, return the user to the public landing page or login
screen.

### Step D --- Restore session on page load

Use the Supabase session and auth-state listener to determine whether a
user is signed in:

``` js
const {
  data: { session }
} = await supabase.auth.getSession();

supabase.auth.onAuthStateChange((_event, session) => {
  // Update application auth state from the Supabase session.
});
```

Unsubscribe from the listener when the component or app instance is
disposed. Protect private routes by checking the real Supabase session,
not just whether a page was visited previously.

------------------------------------------------------------------------

## 5. Supabase Email Template

In the Supabase dashboard, open **Authentication → Emails → Templates →
Magic Link or OTP** (the exact dashboard labels can change).

The template should use the OTP token variable `{{ .Token }}` rather
than only `{{ .ConfirmationURL }}` if the UI expects users to type a
code.

Suggested subject:

``` text
Your SchemeMatch AI Verification Code
```

Suggested HTML body:

``` html
<h2>Your SchemeMatch AI Verification Code</h2>
<p>Use this one-time password to sign in:</p>
<h1>{{ .Token }}</h1>
<p>This code expires shortly. Do not share it with anyone.</p>
```

Save the template after updating it. Confirm that the page's OTP
verification logic and the Supabase email template agree on a code-based
flow. Do not show a successful verification state until Supabase
confirms verification.

------------------------------------------------------------------------

## 6. Resend SMTP Configuration

Supabase's default email sender is restricted and is not appropriate for
a public application. The project was set up to use Resend as its custom
SMTP provider.

### Resend SMTP values

Use the credentials shown in the Resend dashboard:

  -----------------------------------------------------------------------
  Setting                             Value
  ----------------------------------- -----------------------------------
  SMTP host                           `smtp.resend.com`

  SMTP port                           `465`

  SMTP username                       `resend`

  SMTP password                       The Resend API key used for SMTP
                                      authentication

  Sender name                         `SchemeMatch AI`

  Sender email                        An authorized sender address on the
                                      verified domain, for example
                                      `noreply@fixofix.online` only if
                                      that sender/domain is verified and
                                      configured in Resend
  -----------------------------------------------------------------------

The Resend dashboard previously showed `fixofix.online` as a verified
domain. Before using `noreply@fixofix.online`, make sure the domain is
still verified and the address satisfies Resend's sender requirements.
Never put the SMTP password or Resend API key in the frontend.

In Supabase, open **Authentication → Emails → SMTP Settings**: 1. Enable
custom SMTP. 2. Enter the host, port, username, password, sender email,
and sender name. 3. Save the configuration. 4. Send a test OTP to an
email address you can access.

Do not assume the SMTP setup is working just because the settings page
saved successfully. Verify delivery end to end.

------------------------------------------------------------------------

## 7. Troubleshooting: "Error sending confirmation email"

This message is generic. Diagnose it using logs rather than guessing.

1.  Open **Supabase → Authentication → Logs / Audit Logs** (dashboard
    labels can vary).
2.  Trigger the OTP request once and locate the corresponding Auth
    event.
3.  Open the Resend dashboard's **Emails** page and refresh it.
4.  Check whether a message appeared and whether its status is failed,
    sent, or delivered.
5.  Compare the provider's error with the Supabase Auth log.

Possible causes include: - Incorrect SMTP username or password. -
Incorrect host or port. - Sender address/domain not verified or not
authorized. - Custom SMTP not saved or not enabled. - Template
configured for a magic link while the UI expects a code. - Provider rate
limits or sending restrictions. - Incorrect Supabase project URL or
client key.

If Resend shows no message at all, first inspect the Supabase Auth logs
and SMTP settings. If Resend records a failed message, use its specific
error to guide the fix. Do not share screenshots containing credentials,
API keys, OTPs, or private email contents.

Supabase's default email service has low sending limits and recipient
restrictions. A custom SMTP provider is needed for normal public-user
sign-in. Check the current limits in the Supabase dashboard and official
documentation because provider limits can change.

------------------------------------------------------------------------

## 8. Database Structure for Profiles

Supabase Auth manages credentials and the identity record.
Application-specific profile fields belong in a separate table linked to
`auth.users`.

Recommended starting point:

``` sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  optional_details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read their own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "Users can insert their own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);
```

`optional_details` can hold optional eligibility information such as
state, district, occupation, family income, household size, and a list
of document types the user reports having. Keep the shape documented and
validate it in the application. Avoid collecting unnecessary sensitive
information.

### Profile creation after OTP verification

After successful verification, upsert the profile with the authenticated
user ID. For example:

``` js
const { data: { user }, error: userError } =
  await supabase.auth.getUser();

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

If the app collects the name before OTP verification, retain it
temporarily in the registration flow and write it only after
authentication succeeds. Never use an email address supplied by the
browser as the authorization check; use the authenticated user ID and
RLS.

### Scheme history

Store previously applied schemes in a separate table instead of an
unstructured array in the profile:

``` sql
create table public.scheme_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  scheme_name text not null,
  scheme_id text,
  application_status text not null default 'considering',
  applied_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.scheme_history enable row level security;

create policy "Users can read their own scheme history"
on public.scheme_history
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can add their own scheme history"
on public.scheme_history
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own scheme history"
on public.scheme_history
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own scheme history"
on public.scheme_history
for delete
to authenticated
using (auth.uid() = user_id);
```

These SQL statements are a recommended structure, not a confirmation
that these tables/policies have already been run. Review them against
the project's existing `Scheme1` and `Scheme2` queries before executing
duplicates.

------------------------------------------------------------------------

## 9. Frontend UI Requirements

The UI references show three authentication screens: - **Login:** email
entry, "Sign in with OTP", "Forgot Password?" and registration
navigation. - **OTP verification:** six-digit code entry, resend
countdown, verify button, and back/change-email navigation. -
**Registration:** full name, email, optional password fields in the
mockup, terms checkbox, and "Register & Verify via OTP".

For the actual email OTP implementation: - Email is required. - Full
name is collected during registration and saved to `profiles` after OTP
verification. - The code input should accept the configured OTP length.
The mockup shows six digits; ensure the Supabase template/settings are
configured consistently. - A password field should not be presented as
functional unless password-based authentication is separately
implemented. - "Forgot Password?" should be hidden or wired to a real
recovery flow; do not leave a misleading dead button. - "Sign in with
OTP" should request a code and then show the verification screen. -
Resend should call the OTP request again, respect cooldowns and provider
limits, and display useful errors. - Include loading states,
invalid/expired-code states, network errors, and a path to change the
email address. - Use responsive layouts and accessible labels. - Do not
hardcode fake users or bypass authentication to display the dashboard.

### Minimal client-side flow

``` js
// 1. Request code
await supabase.auth.signInWithOtp({
  email,
  options: { shouldCreateUser: true }
});

// 2. Verify code
const { data, error } = await supabase.auth.verifyOtp({
  email,
  token: otp,
  type: 'email'
});

// 3. Only after success: save profile and navigate to dashboard
```

Add appropriate error handling around each call. This snippet is
illustrative; the actual UI should handle validation, loading states,
and errors.

------------------------------------------------------------------------

## 10. Security and Privacy Checklist

-   [ ] Frontend uses only the project URL and publishable key.
-   [ ] Supabase secret/service-role keys and Resend SMTP credentials
    are never exposed to the browser.
-   [ ] RLS is enabled for every table containing user-specific data.
-   [ ] Policies restrict profile and scheme-history rows to
    `auth.uid()`.
-   [ ] Every private page checks the real Supabase session.
-   [ ] OTPs and passwords are never logged or stored by the
    application.
-   [ ] User-entered profile data is validated and only necessary data
    is collected.
-   [ ] Error messages do not reveal sensitive account details.
-   [ ] The actual authentication mechanism is described honestly; mock
    "government SSO", Aadhaar, DigiLocker, or verification badges are
    not represented as real integrations.
-   [ ] Test registration, returning-user login, invalid code, expired
    code, resend, sign-out, refresh/session restoration, and cross-user
    data isolation.

------------------------------------------------------------------------

## 11. Status: Confirmed vs. To Verify

### Confirmed from the setup discussion

-   Supabase project `Schemematch` is in the Mumbai region.
-   The project uses Supabase Auth for email OTP.
-   A browser test page was created using `@supabase/supabase-js` v2 and
    `signInWithOtp` / `verifyOtp`.
-   Resend was selected as the custom SMTP provider.
-   The Resend dashboard showed `fixofix.online` as a verified domain.
-   The team has saved two database SQL queries named `Scheme1` and
    `Scheme2`.
-   The intended data model has a user profile, optional user details,
    and previous scheme/application history.

### Must be verified in the dashboard/repository

-   Exact project URL and publishable key are correctly set in the
    frontend environment.
-   Custom SMTP values are saved correctly and email delivery works for
    non-organization users.
-   The email template uses `{{ .Token }}` for the code-based flow.
-   The exact contents of `Scheme1` and `Scheme2`, and whether they have
    already been run.
-   The `profiles` and `scheme_history` tables and RLS policies exist
    and have been tested.
-   The production UI does not accidentally expose password login or
    unsupported identity integrations as working features.

------------------------------------------------------------------------

## 12. Official References

-   Supabase Auth SMTP: https://supabase.com/docs/guides/auth/auth-smtp
-   Supabase troubleshooting for auth email delivery:
    https://supabase.com/docs/guides/troubleshooting/not-receiving-auth-emails-from-the-supabase-project-OFSNzw
-   Supabase Auth error codes:
    https://supabase.com/docs/guides/auth/debugging/error-codes
-   Supabase JavaScript Auth API:
    https://supabase.com/docs/reference/javascript/auth-signinwithotp
-   Supabase JavaScript OTP verification:
    https://supabase.com/docs/reference/javascript/auth-verifyotp
-   Resend SMTP documentation: https://resend.com/docs/send-with-smtp


---

## 13. Explicit Domain, Email Addresses, and APIs Used

### Domain

- **Verified Resend domain shown during setup:** `fixofix.online`
- **Example sender address:** `noreply@fixofix.online`
- Use `noreply@fixofix.online` only if Resend confirms that the address/domain is authorized to send. The verified domain is known from the setup discussion; the exact sender address actually saved in Supabase still needs confirmation.

### Email addresses involved

1. **User's login email** — entered by each SchemeMatch AI user. Supabase sends the OTP to this address. Do not hardcode a single user's email in the application.
2. **Sender email** — intended example: `noreply@fixofix.online`. This is the address displayed as the sender for authentication emails, subject to Resend sender/domain configuration.
3. **Account/owner email** — the Gmail address used to own the Supabase organization during setup. Its exact address was not provided in the available setup details, so it is intentionally not guessed here.

### APIs, SDKs, and SMTP endpoints

| Service / API | Purpose | Configuration / usage |
|---|---|---|
| Supabase Project API URL | Connect the frontend to the correct Supabase project | Copy the exact project URL from Supabase **Connect** or project API settings; expected URL format is `https://<project-id>.supabase.co`. The exact project ID/URL must be copied from the dashboard, not guessed. |
| Supabase Publishable Key | Browser/client authentication and authorized Supabase client requests | `sb_publishable_...`; put it in the frontend environment variable `VITE_SUPABASE_PUBLISHABLE_KEY`. |
| Supabase Secret Key | Privileged server-side operations only, if needed | `sb_secret_...`; never put it in frontend code or commit it to source control. |
| Supabase Auth `signInWithOtp` | Requests an email OTP | `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })` |
| Supabase Auth `verifyOtp` | Verifies the email OTP and establishes a session | `supabase.auth.verifyOtp({ email, token: otp, type: 'email' })` |
| Supabase Auth `getSession` / `onAuthStateChange` | Restore and track the user's session | Use the Supabase JavaScript SDK v2. |
| Supabase Auth `signOut` | Signs the current user out | `supabase.auth.signOut()` |
| Supabase Postgres API / `supabase-js` database client | Read and write profile and scheme-history records under RLS | Example: `supabase.from('profiles').upsert(...)`. |
| Resend SMTP | Sends Supabase authentication emails | Host `smtp.resend.com`, port `465`, username `resend`, password is a Resend API key. Configure under Supabase **Authentication → Emails → SMTP Settings**. |
| Resend API key | SMTP authentication credential | Keep private. Do not include the key itself in this document, frontend code, GitHub, screenshots, or chat. |

### Environment variables

For a Vite frontend:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_REPLACE_WITH_YOUR_KEY
```

These are placeholders: replace them locally with the exact Supabase project URL and publishable key. Do not put the Supabase secret key or Resend API key in `VITE_` variables, because Vite exposes those variables to browser code.

If a backend needs a privileged key or Resend API key, store it in server-side environment variables such as `SUPABASE_SECRET_KEY` or `RESEND_API_KEY` and never send it to the frontend. Only add those variables if the backend actually needs them.

### Current known values vs. values not available here

**Known from the setup discussion**
- Domain: `fixofix.online`
- Resend SMTP host: `smtp.resend.com`
- Resend SMTP port: `465`
- Resend SMTP username: `resend`
- Supabase client SDK: `@supabase/supabase-js` v2
- Supabase Auth methods used by the test page: `signInWithOtp`, `verifyOtp`, and `signOut`
- The Supabase project is named `Schemematch` and is in the South Asia (Mumbai) region.

**Do not guess; copy/check in the dashboards**
- Exact Supabase project URL and project ID.
- Full Supabase publishable key.
- Exact sender email currently saved in SMTP settings.
- The account owner's full Gmail address.
- The Resend API key / SMTP password.
- Whether the current SMTP settings and sender are saved and successfully sending mail.

Never put actual secret values into this documentation. Keep the real credentials in the appropriate local or server-side environment configuration.
