# SchemeMatch AI — Security Requirements

> **Product:** SchemeMatch AI — SchemeMatch AI  
> **Document purpose:** Define security, privacy, and trust requirements for the frontend, FastAPI backend, Supabase, source-research workflow, and separately developed AI integration.  
> **Confirmed decisions:** Complete application security; Supabase Auth login required; strict data minimisation; no private profile details sent to external search; no secrets in frontend code.  
> **Status:** Security requirements for implementation. Review the open decisions before production deployment.

---

## 1. Purpose and Priority

This document defines security requirements for SchemeMatch AI. Read it together with:

- `prd.md` — product purpose, privacy principles, and functional requirements.
- `setup.md` — local environment, configuration, and secrets handling.
- `architecture.md` — modular monolith, hybrid scheme sourcing, deterministic eligibility engine, and Supabase.
- `components.md` — frontend components and the provisional API integration boundary.

The product handles personal circumstances such as education, occupation, household circumstances, income ranges, and other eligibility-related information. Treat these details as private even when a field is optional.

### Confirmed decisions

1. **Authentication is required:** users must sign in through Supabase Auth before using the protected SchemeMatch AI discovery and profile features.
2. **Minimise personal data:** collect only fields genuinely needed for the user's requested scheme matching.
3. **Do not send private profile details to external search:** external search requests must not contain a person's private profile, name, email, phone, account ID, or other identifying/personal attributes.
4. **No secrets in browser code:** never put service-role keys, search credentials, private API keys, database passwords, or other secrets in HTML, JavaScript, public configuration, source control, or client-visible logs.
5. **AI separation:** the frontend calls the product API, not Ollama or model/search providers directly.
6. **Explainable eligibility:** AI-generated output is untrusted until validated; final condition evaluation remains in deterministic backend rules.

### Important documentation alignment

Earlier setup and architecture guidance allowed discovery without an account as a prototype option. The latest confirmed decision in this document supersedes that default: **authentication is required**. Update `setup.md`, `architecture.md`, `components.md`, and the implementation/API contract to match before integrating the protected user journey. Do not implement guest access and login-required access as competing behaviours.

---

## 2. Security Principles

- **Least privilege:** each user, service, and integration receives only the access it needs.
- **Server-side enforcement:** frontend visibility is not an access-control mechanism.
- **Privacy by default:** do not collect or persist profile data merely because it may be useful later.
- **Source traceability:** eligibility claims must retain links to the rule and source supporting them.
- **Fail safely:** when auth, source verification, or a dependency fails, do not return a fabricated success or claim eligibility.
- **Separation of duties:** the AI can propose interpretations and structured extraction; trusted backend code validates input and evaluates reviewed rules.
- **No secrets in prompts:** do not include credentials, access tokens, or private configuration in model prompts.
- **Secure by configuration:** development defaults must not silently become production settings.

---

## 3. Identity and Authentication — Supabase Auth

### 3.1 Required behaviour

- Require a valid authenticated user session for the discovery, profile, and other protected application features.
- Provide clear sign-in, sign-out, expired-session, and unauthorised states.
- The backend must verify the user's access token/session on every protected request. Do not trust a user ID sent in the request body or query string.
- Derive the authenticated user ID from the validated identity/session on the server.
- Return `401 Unauthorized` when authentication is missing, invalid, or expired. Return `403 Forbidden` when the authenticated user does not have permission for the requested action.
- Sign-out must invalidate or remove the client session using the chosen Supabase Auth flow and clear any app-held user state.
- Do not display private profile or saved-result data before authentication has been verified.
- Use appropriate account-recovery and email-verification settings for the chosen deployment. Confirm those exact settings before launch.

### 3.2 Session handling

The exact session mechanism is not finalised. Choose and document one implementation before building auth-dependent features:

- Supabase Auth client session managed in the browser, using only public client configuration and strict database policies; or
- a backend-managed session/cookie approach, with secure cookie settings and suitable CSRF protections.

Do not mix multiple session patterns casually. Document where tokens are stored, how they reach FastAPI, how refresh works, and how logout/expiry are handled.

Whichever approach is selected:

- Never put access or refresh tokens in URLs.
- Never log tokens.
- Use HTTPS in deployed environments.
- If cookies authenticate state-changing requests, apply suitable CSRF protections, including appropriate `SameSite` settings and request validation.
- Protect against cross-site scripting (XSS), which can compromise browser-held session material.
- Do not invent custom token validation. Follow the supported Supabase/Auth libraries and verify tokens server-side.

### 3.3 Registration and account recovery

The product requirements do not yet define whether registration is open, invite-only, email-verified, or uses additional factors. Do not add an unrequested authentication provider or weaken account-recovery settings for convenience. Ask the product owner before making these consequential identity-policy decisions.

---

## 4. Authorisation and Supabase Database Security

Authentication answers “who is this user?” Authorisation answers “what may this user access?” Both are required.

### 4.1 Row Level Security (RLS)

- Enable and test Supabase Row Level Security on every table containing user-owned data.
- For user-specific records, enforce ownership using the authenticated identity, normally the verified user ID.
- Apply access policy to reads, inserts, updates, and deletes independently as appropriate.
- Do not rely only on frontend filters such as `user_id = currentUser.id`.
- Test that User A cannot read, update, or delete User B's profile, saved matches, or checklist.
- Deny access by default where a policy has not been intentionally defined.
- Separate public/reviewed scheme catalogue data from private user data.
- Restrict any scheme-review/admin operations to explicitly authorised roles; do not trust a role value supplied by the browser.

### 4.2 Keys and database access

- Keep Supabase service-role/privileged keys strictly on the server and only where genuinely required.
- Never embed service-role keys in frontend files or expose them through API responses, error messages, screenshots, or logs.
- A Supabase publishable/anon key, if a chosen browser-side Auth SDK needs it, is public configuration rather than a secret. Expose it only as intended by Supabase and rely on server-side authorisation plus correct RLS—not on hiding that public key.
- Prefer scoped server credentials and least-privilege access.
- Keep schema changes in reviewed migrations or documented SQL scripts.
- Use parameterised/typed database operations and avoid constructing SQL from raw user input.

### 4.3 API-level authorisation

For any record-specific endpoint:
- Validate the requested record identifier.
- Confirm the record belongs to the current user or is explicitly public.
- Do not reveal whether another user's private record exists.
- Test for insecure direct object reference (IDOR) by changing IDs in requests.
- Apply the same access rules to exports, detail endpoints, background jobs, and checklist persistence.

---

## 5. Personal Data Minimisation and Privacy

### 5.1 Collect only what is necessary

- Ask only for profile fields required by the supported eligibility rules and user-selected flow.
- Explain why a field is requested when the purpose may not be clear.
- Allow optional fields to remain unknown.
- Do not infer sensitive facts from unrelated information.
- Do not require identity-document uploads for basic scheme discovery.
- Avoid collecting Aadhaar numbers, bank details, identity scans, exact addresses, or other high-risk data unless the product owner has explicitly approved a justified feature and its safeguards.
- Do not use analytics or telemetry that captures profile text, eligibility details, auth tokens, or other private information.

### 5.2 External search boundary — mandatory

External search is for discovering public scheme information, not for evaluating a specific person's private profile.

**Never send these to an external search provider:**
- User's full natural-language prompt when it contains private profile details.
- Name, email, phone, Supabase user ID, account identifiers, or exact address.
- Private household, income, education, health, caste/category, occupation, land, or other profile attributes in an identifiable or combined form.
- Auth tokens, session cookies, database values, or secrets.

Instead:
1. Extract only the broad, non-identifying topic needed for finding public schemes (for example, a general scheme category or state/region when necessary).
2. Prefer query templates that search for public scheme information without including user-specific facts.
3. Perform eligibility comparison inside the backend against structured scheme rules.
4. Keep private profile values in the request-scoped backend workflow and avoid putting them into external search logs.
5. If safe query minimisation cannot be performed, skip the external search for that request and use the reviewed catalogue or ask the user for a less sensitive query.

Do not assume that a search provider is privacy-safe merely because the local model runs through Ollama. External source retrieval remains a separate data flow that must be inspected.

### 5.3 Local model and AI processing

- Prefer local Ollama inference for private profile interpretation where practical.
- Do not include personal profile values in model prompts unless required for the specific task and approved by the backend flow.
- Do not send the profile to a hosted model or other third-party AI endpoint without explicit product-owner approval and clear user disclosure.
- Do not include unnecessary identifiers in prompts.
- Keep prompts, retrieved source text, profile fields, and credentials separated wherever possible.
- Ensure exception traces and model diagnostics do not expose personal values or secrets to the browser or logs.

### 5.4 Persistence and retention

- Persist profile data, matching results, and checklist state only for a defined user-facing purpose.
- Do not assume authentication means all user data should be saved permanently.
- Provide a clear explanation of what is saved and how the user can request deletion, once the persistence policy is decided.
- Establish retention and deletion periods before launch.
- Avoid retaining raw natural-language prompts when structured, minimal fields are sufficient.
- Apply access controls to backups, exports, and operational data too.

**Open decision:** the exact retention period and whether full profile details or only saved results are persisted must be confirmed before production deployment.

---

## 6. Frontend Security — HTML, Tailwind CSS, JavaScript

- Treat all user input, AI output, extracted PDF text, and search results as untrusted.
- Use `textContent` and safe DOM construction for untrusted strings; do not insert untrusted values into `innerHTML`.
- Do not execute model output as JavaScript, HTML, Markdown with unsafe HTML, or a template.
- Validate data in the browser for usability and re-validate it in FastAPI for security.
- Do not expose API secrets or privileged credentials in `config.js`, HTML attributes, bundled assets, source maps, or browser storage.
- Do not log prompts, profiles, access tokens, or full API request/response bodies to the console.
- Use secure external links; when opening a link in a new tab, use `rel="noopener noreferrer"` with `target="_blank"`.
- Implement visible focus states and accessible error messaging without leaking server details.
- Do not store profile values in persistent browser storage unless the user-facing need and security impact have been reviewed.
- Avoid third-party scripts and dependencies that are not needed.
- Use a restrictive Content Security Policy (CSP) appropriate to the deployment, and test it against the actual scripts/styles used.

### Authentication UI

- Hide protected views when there is no valid session, but treat this only as a usability measure; FastAPI must independently enforce authentication.
- Handle expired sessions without repeatedly retrying sensitive requests.
- Clear in-memory profile and result state on sign-out, where practical.
- Do not place tokens, passwords, or private profile values in URLs or navigation state.

---

## 7. FastAPI Backend Security

### 7.1 Request validation

- Define typed request and response schemas.
- Set appropriate maximum lengths and payload-size limits.
- Validate enum values, identifiers, numbers, dates, and nested objects.
- Reject malformed input with safe, predictable errors.
- Never trust frontend validation alone.
- Do not include arbitrary object deserialisation or unsafe evaluation of user-supplied expressions.
- Do not let a user choose unrestricted file paths, remote URLs, SQL fragments, model names, or internal service addresses through ordinary form fields.

### 7.2 Authentication and authorisation

- Use supported Supabase token-verification methods or libraries.
- Verify signature, expiry, issuer/audience expectations, and other required token claims according to the configured Auth setup.
- Derive user identity from the validated token, never from a caller-supplied ID.
- Protect every private endpoint, including less visible detail, export, and saved-result routes.
- Keep authentication logic centralised so one endpoint cannot accidentally omit it.

### 7.3 CORS, transport, and network exposure

- Allow only explicitly configured frontend origins. Do not use wildcard origins with credentialed requests.
- Configure CORS separately for local development and production.
- Use HTTPS for all deployed traffic.
- Bind development services to localhost by default.
- Do not expose Ollama's local port or development API documentation publicly without deliberate access controls.
- Avoid overly detailed server banners or internal paths in public responses.

### 7.4 Error handling and logging

- Return safe client-facing error messages and appropriate status codes.
- Do not return stack traces, environment values, SQL errors, internal file paths, prompts, or credentials to users.
- Use a request/correlation ID for troubleshooting, without embedding personal details in it.
- Log the minimum operational facts needed for diagnosis (such as route, status, duration, and error category).
- Redact `Authorization`, cookies, passwords, tokens, profile values, and prompt content from logs.
- Do not log full response objects from Supabase or model/search clients in production.

### 7.5 Abuse prevention

- Add rate limits to sign-in-related, discovery, search, and other costly endpoints.
- Apply request timeouts and reasonable concurrency limits to model/search operations.
- Set limits for prompt length, response length, and PDF size/page count.
- Prevent clients from forcing repeated expensive searches or unlimited model calls.
- Do not expose a general-purpose proxy to arbitrary Ollama endpoints or arbitrary external URLs.
- Use safe retry policies with bounded attempts and backoff; avoid infinite retry loops.

**Open decision:** exact rate limits, request quotas, and concurrency values should be set after expected demo and deployment traffic are known. Keep them configurable.

---

## 8. AI Integration Security Contract

The AI module is being developed separately. It must comply with this section at its boundary, regardless of its internal implementation.

### 8.1 Trust boundaries

- The AI service/module receives only the minimum data necessary for its task.
- The AI does not receive Supabase service-role keys, search-provider credentials, passwords, session tokens, or other secrets.
- The AI output is data to validate—not an instruction to the backend, an authorisation decision, or a verified eligibility rule.
- The model cannot decide which user is authorised to access a record.
- The model cannot execute SQL, shell commands, arbitrary code, or unrestricted tools based on user/source content.
- The browser does not call the model directly.

### 8.2 Prompt injection and hostile content

- Treat user text, website content, search results, and PDF contents as untrusted data—even when they contain text that appears to instruct the model.
- Keep system/developer instructions separate from retrieved text and profile data.
- Do not let retrieved sources override application security rules or the agreed task.
- Do not follow instructions in a PDF or webpage to reveal secrets, make network calls, change permissions, or alter system behaviour.
- Avoid granting the AI unrestricted browsing, file-system, shell, or database tools.
- Validate links and source provenance outside the model.
- Prefer structured outputs that conform to a defined schema; reject malformed or unexpected output.

### 8.3 Structured extraction and eligibility boundary

- The model may assist in extracting candidate scheme names, eligibility clauses, exceptions, document requirements, and source snippets.
- Candidate extraction must retain source provenance and verification state.
- New or changed rules must not become verified solely because the model generated them.
- Deterministic Python logic evaluates known, reviewed, structured rules.
- A missing or ambiguous fact must remain `unknown`; do not invent a value or convert uncertainty into a positive result.
- The model must not generate a fake official URL, deadline, income limit, eligibility rule, or document requirement.
- If rule structure or source validity is insufficient, mark it unverified/unknown and require review instead of claiming confirmed eligibility.

### 8.4 No private profiles in web searches

This is a strict integration requirement:
- Do not pass the full user query or profile to Open WebUI, a search API, a public website, or any other external research service if it contains private profile details.
- Use a privacy-preserving query builder that emits only general, non-identifying search terms.
- Evaluate profile eligibility locally in the backend against structured scheme rules.
- If an integration cannot guarantee this separation, do not send the request through it until the design is corrected.

### 8.5 AI API input/output schema

Before integrating with the separate AI implementation, agree on:
- Exact request and response schemas.
- Which fields are permitted to cross the boundary.
- How missing/unknown values are represented.
- Source/provenance format.
- Verification status and confidence/uncertainty fields, if used.
- Timeout, cancellation, error, and retry behaviour.
- Versioning and compatibility guarantees.

Do not guess the AI teammate's endpoint names or payload structure. Keep the integration behind a backend adapter so the product API does not depend on an undocumented internal implementation.

---

## 9. Hybrid Search, External Sources, and PDF Processing

### 9.1 Search and source safety

- Allow outbound calls only to configured providers/services where feasible.
- Avoid a general URL-fetch endpoint that accepts arbitrary user-supplied URLs; this can create server-side request forgery (SSRF) risks.
- If a URL must be fetched, validate scheme and hostname, block loopback/private/link-local/reserved network targets as appropriate, re-check redirects, and apply timeouts and response-size limits.
- Do not forward auth headers, cookies, or secrets when fetching official source URLs.
- Record source URLs and verification metadata, but do not label source content verified solely based on search rank or model confidence.
- Treat fetched pages as hostile input and sanitise them before rendering.

### 9.2 PDF extraction

- Process only permitted files/sources and enforce file size, page count, and processing-time limits.
- Treat PDF text as untrusted input.
- Use maintained parsing dependencies and update them regularly.
- Do not execute embedded content or trust metadata as code.
- Handle malformed/encrypted/unreadable PDFs without crashing the application.
- If user-uploaded documents are added in a future feature, assess malware scanning, temporary storage, deletion, privacy, and content-type validation before enabling that feature. User document uploads are not required for the core discovery flow.

---

## 10. Secrets and Environment Configuration

Follow `setup.md` and extend its configuration carefully.

- Store secrets in local environment files or a suitable deployment secret manager.
- Keep `.env`, private key files, tokens, and local credentials out of Git.
- Commit only placeholder-based `.env.example` files.
- Check `.gitignore` before the first commit.
- Never paste real credentials into Markdown, prompts, screenshots, logs, issue reports, or AI coding-agent instructions.
- Separate development and production credentials.
- Rotate any secret that is accidentally exposed; deleting it from the latest commit alone is not enough.
- Do not print all environment variables during debugging.
- Load configuration centrally and fail clearly when required configuration is missing.
- Restrict who can access production secrets and rotate them according to the deployment policy.

A public Supabase anon/publishable key is not equivalent to a service-role secret; it may be used in a browser only as intended by the selected Supabase Auth setup, with correct RLS and authorisation. **No privileged key may appear in the frontend.**

---

## 11. Dependency and Build Security

- Use maintained versions of Python, FastAPI, Auth clients, Supabase clients, PDF parsers, and frontend dependencies.
- Pin or constrain dependencies in the project's dependency files and review updates before accepting them.
- Avoid installing packages copied from untrusted instructions or unknown repositories.
- Remove unused packages and development-only tools from production deployments.
- Inspect build output and source maps for accidentally embedded secrets.
- Use automated dependency/security checks where practical.
- Do not execute commands suggested by retrieved PDFs/webpages or model output without human review.

---

## 12. Security Testing Checklist

Security work is not complete until the relevant behaviours have been tested.

### Authentication
- [ ] Protected endpoints reject requests without a token.
- [ ] Invalid, expired, or malformed tokens are rejected.
- [ ] Sign-out clears the app session/state appropriately.
- [ ] Login and recovery errors do not reveal unnecessary account details.

### Authorisation and database
- [ ] RLS is enabled on user-owned tables.
- [ ] User A cannot read or modify User B's data.
- [ ] Directly changing a record ID does not bypass ownership checks.
- [ ] Unauthenticated or insufficiently privileged users cannot invoke review/admin functions.
- [ ] No service-role key is present in frontend assets or client responses.

### Privacy
- [ ] External search requests contain no private profile fields or identifiers.
- [ ] Logs contain no tokens, passwords, raw private prompts, or unnecessary profile data.
- [ ] Data persistence matches the documented purpose and retention policy.
- [ ] Sign-out removes visible user-specific page state where applicable.

### Input and AI boundaries
- [ ] XSS-like values render as text, not executable HTML/script.
- [ ] Prompt-injection content in PDFs/webpages does not override system rules or cause tool misuse.
- [ ] Invalid or unexpected AI output is rejected safely.
- [ ] Model output cannot directly create a verified eligibility rule.
- [ ] Unknown eligibility conditions remain unknown.
- [ ] Arbitrary external URLs cannot be used to access internal services.

### API and operations
- [ ] CORS allows only intended origins.
- [ ] Rate limits, timeouts, and payload limits are tested.
- [ ] Server errors do not expose stack traces or secrets.
- [ ] Search/model outages produce a safe, honest UI state.
- [ ] Production secrets are separate from development credentials.

---

## 13. Incident and Recovery Basics

Before any public deployment, document a simple response process:

1. **Contain:** disable the affected key, integration, endpoint, or account access.
2. **Rotate:** replace exposed credentials and revoke the old ones.
3. **Assess:** identify what data or systems may have been affected using minimal, access-controlled logs.
4. **Remediate:** patch the cause and check related endpoints/configuration.
5. **Verify:** rerun relevant security tests before restoring the feature.
6. **Document:** record the incident and follow applicable notification obligations.

Do not claim that an incident is resolved until the affected credential or vulnerability has actually been addressed and verified.

---

## 14. Implementation Priorities

### Before the first integrated demo
1. Implement required Supabase Auth and server-side authentication checks.
2. Enable RLS and test user-to-user isolation for any user-owned tables.
3. Keep service credentials out of frontend code.
4. Establish a shared API contract with the backend/AI teammate.
5. Ensure external search never receives private profile details.
6. Validate AI outputs and keep eligibility evaluation deterministic.
7. Add safe error handling, payload limits, and dependency timeouts.

### Before public deployment
1. Decide and document session handling, retention, deletion, and account recovery.
2. Enforce HTTPS, production CORS, and an appropriate Content Security Policy.
3. Set and test rate limits and operational monitoring.
4. Review dependency/build security and secret management.
5. Complete the security checklist and an end-to-end authorisation test.
6. Review applicable privacy and data-protection obligations. This document is not a legal compliance certification.

---

## 15. Open Decisions — Ask Before Finalising

Do not silently choose these consequential policies:

1. **Session pattern:** browser-managed Supabase Auth session, or backend-managed secure cookies/session?
2. **Registration policy:** open self-registration, verified email, invitation-only, or another model?
3. **Data retention:** how long should profiles, saved matches, and checklist state be retained, and what should deletion remove?
4. **Persistence scope:** should the app save full profile values, or only selected results/checklists needed by the user?
5. **Admin/reviewer access:** who may approve or update scheme rules, and how will those actions be audited?
6. **External services:** which exact search provider will be configured, and what data handling terms apply? The privacy boundary in this document remains mandatory regardless of provider.
7. **Production environment:** where will the frontend/backend run, and what production domains/origins must be allowed?
8. **Security operations:** who owns credential rotation, dependency updates, incident response, and access to production logs?

Use secure defaults for local development while these items are unresolved, but do not represent the product as production-ready. Ask the product owner before making a consequential choice.

---

## 16. Instructions for Antigravity and the AI Teammate

- Read `prd.md`, `setup.md`, `architecture.md`, `components.md`, and this document before changing security-sensitive code.
- Inspect the existing repository and preserve working behaviour where practical.
- Treat this file's confirmed choices as requirements, especially required authentication, strict data minimisation, no private profile details in external searches, and no frontend secrets.
- Align the older documents with the confirmed login-required decision.
- Do not invent or claim a working Auth flow, RLS policy, search privacy control, or AI integration before implementing and testing it.
- Keep external integrations behind backend adapters and document their request/response schemas.
- Ask before changing consequential security choices listed in Section 15.
- If a requirement cannot be implemented with the selected integration, explain the limitation and provide a safer alternative rather than silently weakening the requirement.

---

**End of security requirements**

This document defines required controls and implementation checks. It is not evidence that the codebase has already implemented them, and it is not a security audit or legal compliance certification.
