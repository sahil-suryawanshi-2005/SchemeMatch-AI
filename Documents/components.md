# SchemeMatch AI — UI Components & API Integration Contract

> **Product concept:** SchemeMatch AI — Reverse-Matching Government Scheme Eligibility & Document Gap Engine  
> **Frontend stack:** HTML5 + Tailwind CSS + vanilla JavaScript  
> **Backend direction:** Python + FastAPI modular monolith  
> **Data strategy:** Reviewed scheme dataset + configured official-source search; Supabase for persistence where implemented  
> **Visual direction:** Premium civic-tech — calm, clear, trustworthy, accessible  
> **Status:** Component specification with **proposed, provisional API contracts**. These endpoints and JSON shapes are not proof of implemented backend functionality. Confirm them with the backend/AI teammate before integration.

---

## 1. Purpose and Related Documents

This document defines the reusable frontend components, their behaviour, the data they display, and the boundary between the browser and the SchemeMatch AI API.

Read this document alongside:

- `prd.md` — product goals, user journey, functional requirements, and acceptance criteria.
- `setup.md` — local development and configuration instructions.
- `architecture.md` — modular monolith, source research, AI adapter, deterministic eligibility engine, and Supabase responsibilities.

If documents conflict, do not silently invent a new requirement. Preserve the product principles in `prd.md`, identify the conflict, and ask for clarification before making a consequential architectural change.

## 2. Component Design Principles

1. **Explain results, not just scores.** Users should understand what matched, what did not match, and what is unknown.
2. **Trust comes from traceability.** Scheme facts and document requirements should link to their supporting source whenever a source exists.
3. **Unknown is a first-class state.** Never turn missing profile values into `false`, `0`, or an inferred answer.
4. **Use plain language.** Avoid unexplained eligibility or model terminology in user-facing text.
5. **Responsive by default.** Support mobile, tablet, and desktop layouts.
6. **Accessible by default.** Use semantic HTML, associated labels, keyboard support, visible focus, and status text that does not rely on colour alone.
7. **No fake functionality.** Do not present hardcoded examples as live scheme matches or live web research. Clearly label demo fixtures.
8. **Keep UI independent of the AI implementation.** The browser calls the product API; it must not call Ollama or the model directly.
9. **Render untrusted content safely.** Treat model output, user input, search results, and extracted PDF text as untrusted data. Prefer `textContent` and safe DOM construction over injecting untrusted strings into `innerHTML`.
10. **Reusable, not overengineered.** Use small vanilla JavaScript modules and semantic HTML templates; do not introduce React or a component framework unless the owner explicitly changes the stack.

## 3. Suggested Frontend Organisation

Adapt to the existing repository first. Do not replace working code or create duplicate structures just to match this example.

```text
frontend/
├── index.html
├── assets/
│   └── images/
├── styles/
│   └── input.css              # Only if using a Tailwind build step
└── js/
    ├── config.js              # Public, non-secret frontend configuration
    ├── api/
    │   └── client.js          # Fetch wrapper, timeout and API errors
    ├── components/
    │   ├── navbar.js
    │   ├── discovery-form.js
    │   ├── profile-review.js
    │   ├── scheme-card.js
    │   ├── scheme-detail.js
    │   ├── eligibility-breakdown.js
    │   ├── document-checklist.js
    │   ├── source-card.js
    │   └── feedback-state.js
    ├── pages/
    │   └── discovery-page.js
    └── utils/
        ├── dom.js
        └── format.js
```

This is a suggested organisation, not a requirement to create every file immediately. Use the Tailwind workflow already documented by the repository. If Tailwind is compiled, keep generated CSS separate from source CSS. If using a development CDN for a prototype, do not treat that as the preferred production setup without reviewing Tailwind's current guidance.

## 4. Component Catalogue

### 4.1 App Shell and Responsive Navbar

**Purpose:** Provide stable navigation and a consistent product identity across the experience.

**Content and behaviour:**
- Show the SchemeMatch AI product name and a short, plain-language descriptor.
- Provide navigation to the discovery experience and any other pages that actually exist.
- On small screens, provide a keyboard-accessible menu toggle with a clear expanded/collapsed state.
- Provide a clear route back to scheme discovery from results or details.
- Do not display dead links, decorative login buttons, or navigation to unimplemented pages.

**Accessibility:** Use a semantic `<nav>` region, an accessible label for the mobile menu control, `aria-expanded`, a visible focus style, and logical keyboard order.

### 4.2 Scheme Discovery Input / Guided Questionnaire

**Purpose:** Let a person describe their circumstances without knowing a scheme name.

**Modes:**
- Natural-language description.
- Guided questionnaire for supported profile fields.

**Behaviour:**
- Explain briefly what information helps find relevant schemes.
- Clearly identify optional fields and avoid requesting unnecessary sensitive data.
- Validate obvious input errors before sending a request.
- Prevent accidental duplicate submissions while a request is processing.
- Preserve the entered information in the current page state after recoverable API errors.
- Allow users to review extracted facts before they are used for matching when the API returns AI-extracted profile fields.
- Never require document uploads for the core discovery flow.

**Output:** A discovery request sent through the shared API client; never invoke Ollama or external search providers directly from the browser.

### 4.3 Profile Form and Extracted-Data Review

**Purpose:** Make model-extracted or normalised profile values visible and correctable.

**Each displayed field should be able to communicate:**
- Field label and current value.
- Value origin, where known: user-provided, extracted, or unknown.
- Whether the user has confirmed or edited the value.
- A short explanation for fields that could be unclear.

**Behaviour:**
- Let the user edit or clear a value before running eligibility matching.
- Represent unknown explicitly; do not use a plausible default value.
- Keep profile values in page memory for the current flow unless saving is deliberately implemented and explained.
- Do not infer sensitive facts from unrelated values.

**Important:** The exact profile-field schema is not finalised in the related documents. Keep form rendering data-driven and align field names/types with the AI/backend teammate's agreed API schema.

### 4.4 Scheme Result Card

**Purpose:** Give users a quick and explainable summary of one candidate scheme.

**Show when available:**
- Scheme name and concise description.
- Issuing authority and geographical scope.
- Overall match state using a text label.
- A short reason the result was returned.
- Count or preview of met, unmet, and unknown conditions.
- A link/button to view details.
- Source/verification status where available.

**Behaviour:**
- Keep cards comparable in structure and hierarchy.
- Do not present a percentage score unless the backend defines its meaning and calibration. A score must never imply official approval.
- Do not claim eligibility is guaranteed.
- If the source is unverified or stale, show that visibly instead of hiding it.

### 4.5 Scheme Detail View

**Purpose:** Present complete information required to understand and verify a result.

**Sections:**
- Scheme overview.
- Issuing authority and applicable region.
- Eligibility condition breakdown.
- Required-document checklist.
- Official source links and any available freshness/verification details.
- Clear note that final eligibility and current requirements must be confirmed with the relevant authority.

**Behaviour:**
- Show unavailable fields as unavailable, not fabricated.
- Keep source links distinct from internal navigation.
- If evidence conflicts or a rule is uncertain, communicate that explicitly.

### 4.6 Eligibility Status and Condition Breakdown

**Purpose:** Explain how the user's known profile compares with scheme criteria.

**Condition states (required):**
- `met` — available user information satisfies the structured rule.
- `not_met` — available user information does not satisfy the structured rule.
- `unknown` — information is missing, ambiguous, or not sufficiently verified.

**Each condition should include when available:**
- Plain-language criterion.
- Status label.
- Short explanation/reason.
- Source or rule reference when provided by the API.
- A clear next step if the condition is unknown.

**Rules:**
- Never map `unknown` to `met` or `not_met` in the UI.
- Do not compute a final eligibility decision in JavaScript. The backend's deterministic rules engine is the source of the condition status.
- Use text/icon plus colour; colour alone is insufficient.
- Distinguish a potential match from formal eligibility or government approval.

### 4.7 Missing-Document Checklist

**Purpose:** Help a user understand what documents a scheme may require.

**Each item should display when available:**
- Document name.
- Requirement note or context.
- Source reference.
- User checklist state, if checklist interaction is enabled.

**Behaviour:**
- Distinguish a document required by the scheme from a document the user says they do not have.
- Initial state should be `not_checked` or equivalent unless the user has explicitly indicated availability.
- Users may mark a document as available, still needed, or not checked if this interaction is implemented.
- Do not upload or store document scans in the core discovery flow.
- If requirements are not verified, label them as uncertain and avoid presenting them as definitive.

**Persistence:** Checklist persistence is not confirmed by the PRD. Until decided, keep interactive checklist state local to the current page/session and do not imply it is saved to an account.

### 4.8 Official Source / Verification Card

**Purpose:** Make source provenance easy to inspect.

**Show when available:**
- Source title.
- Issuing department/authority or source domain.
- Source URL.
- Publication or last-checked date, if available.
- Verification state.

**Recommended verification states:** `verified`, `unverified`, `stale`, `unknown`. These are display states, not proof that an authority endorsed SchemeMatch AI.

**Behaviour:**
- Open external sources in a safe, understandable way.
- Use a visible external-link cue and appropriate `rel="noopener noreferrer"` if opening a new tab with `target="_blank"`.
- Never invent source URLs or dates.
- Do not label a source official just because a search result claims it is official; the backend/source-review process must supply that status.

### 4.9 Loading, Empty, Error, and Unverified States

Implement reusable states for:

- Initial/idle discovery state.
- Submitting / searching state.
- Results loading or processing state.
- No candidate schemes found.
- Additional profile information required.
- Live search unavailable or not configured.
- No trustworthy source found.
- Scheme rule or document data unverified.
- Local AI/model unavailable or timed out.
- PDF extraction failure.
- Network/API error.
- Unexpected response or server error.

**Behaviour:**
- Explain what happened in plain language.
- Give an actionable next step, such as reviewing inputs, retrying, or using the verified dataset.
- Do not show fabricated results to fill an empty state.
- Do not imply live research occurred when the search integration is disabled or failed.
- Keep existing form values after recoverable errors.
- Provide a retry action only when retrying is safe.

## 5. Premium Civic-Tech Visual Direction

The exact colour tokens, typography, spacing scale, shadows, radii, and motion rules belong in a separate `design-system.md`. Until that document exists, apply these principles without hardcoding a competing design system:

- Calm, credible, human-centred, public-service feel.
- Strong visual hierarchy and generous whitespace.
- Readable body text and short explanatory copy.
- Restrained colour use; reserve status colours for meaningful status and always pair them with text.
- Consistent card anatomy, border treatment, spacing, and button hierarchy.
- Subtle transitions only where they improve feedback.
- Avoid generic AI-dashboard clutter, unnecessary gradients, excessive glassmorphism, loud animations, and decorative metrics that have no product meaning.
- Ensure the interface remains useful on mobile and with reduced-motion preferences.

Do not mimic the visual identity of a government department or imply official government affiliation. SchemeMatch AI is an independent discovery/information tool unless the product owner confirms otherwise.

## 6. Frontend ↔ Backend Integration Boundary

### 6.1 Core rule

The browser talks only to the SchemeMatch AI FastAPI product API. The backend/AI teammate owns the internal orchestration, live source search, PDF extraction, model interaction, structured scheme data, and deterministic eligibility assessment according to `architecture.md`.

The frontend must not:
- Call Ollama directly.
- Hold model or search-provider credentials.
- Implement eligibility business rules.
- Treat model-generated text as verified scheme criteria.
- connect directly to Supabase using a privileged service-role key.

### 6.2 API client

Create a single shared fetch wrapper in `frontend/js/api/client.js`. It should:
- Read a configurable API base URL from public frontend configuration.
- Set `Content-Type: application/json` for JSON requests.
- Handle non-2xx responses consistently.
- Distinguish network errors, timeouts, and API error responses.
- Validate response shape before the UI renders it.
- Avoid logging private profile contents to the console.
- Never include secret keys in browser configuration.

The API base URL may be public configuration; credentials are not. The actual development origin and CORS allowlist must be configured to match the frontend server described in `setup.md` and the backend configuration.

## 7. Proposed API Contracts — Provisional

**Important:** The following route names and payloads are proposed to help frontend/backend coordination. They are not documented as existing routes in `architecture.md` or `setup.md`. Confirm them with the backend/AI teammate before implementing clients or server endpoints. Keep all routes under a versioned prefix if the team adopts these proposals.

### 7.1 Submit a discovery request

**Proposed route:** `POST /api/v1/discovery`

**Request example:**

```json
{
  "query": "I am a college student from Maharashtra looking for education support.",
  "profile": {
    "state": "Maharashtra",
    "occupation": "student"
  },
  "input_mode": "natural_language"
}
```

Contract notes:
- `query` may be empty only when a guided profile provides sufficient input; the final validation rule must be agreed by the API owner.
- `profile` contains only supported, user-provided or user-confirmed fields. The exact field catalogue is not finalised.
- `input_mode` is a proposed field with values such as `natural_language` or `guided_form`; agree its final name/values with the backend teammate.
- Unknown facts must be omitted or represented explicitly as unknown according to the agreed schema; they must not be silently filled in.
- Do not send unnecessary identifiers or document scans.

**Proposed response example:**

```json
{
  "request_id": "example-request-id",
  "results": [
    {
      "scheme_id": "example-scheme-id",
      "name": "Example scheme — demo data only",
      "summary": "Illustrative response, not a real scheme recommendation.",
      "overall_status": "needs_information",
      "reason": "Some eligibility conditions still need confirmation.",
      "conditions": [
        {
          "condition_id": "income_limit",
          "label": "Household income meets the scheme limit",
          "status": "unknown",
          "explanation": "Household income has not been provided.",
          "source_ids": []
        }
      ],
      "required_documents": [],
      "sources": [],
      "verification_status": "unknown",
      "last_checked_at": null
    }
  ],
  "follow_up_questions": [],
  "disclaimer": "This result is informational, not an official eligibility decision."
}
```

This JSON is a shape example only. Do not use the example scheme as a real result. Agree enum values and field names with the backend/AI teammate before treating this as a binding contract.

### 7.2 Suggested shared data states

| Concept | Suggested values | Meaning |
|---|---|---|
| Eligibility condition | `met`, `not_met`, `unknown` | Deterministic condition evaluation result |
| Overall result | `potential_match`, `needs_information`, `criteria_not_met`, `unverified` | A summary of the available condition results, never official approval |
| Source verification | `verified`, `unverified`, `stale`, `unknown` | Source/rule review state supplied by backend |
| User document checklist | `not_checked`, `available`, `still_needed` | User-entered checklist state; not proof of document validity |

Agree the exact enum strings with the API owner and use them consistently. The frontend should handle unknown/unrecognised enum values safely rather than crashing or making a positive claim.

### 7.3 Proposed error shape

```json
{
  "error": {
    "code": "SEARCH_UNAVAILABLE",
    "message": "Live scheme search is temporarily unavailable.",
    "request_id": "example-request-id"
  }
}
```

The backend may choose another standard format. Once agreed, document it in one place and have the frontend client normalise it for components.

### 7.4 Suggested error handling

| Situation | UI behaviour |
|---|---|
| `400` / validation error | Explain which field needs attention; keep entered values |
| `422` / invalid structured request | Show a simple correction message; do not expose a raw stack trace |
| `429` / rate limited, if enabled | Explain that requests are temporarily limited and when to retry if known |
| `5xx` / server or integration error | Show a recoverable message and retry where safe |
| Network failure / timeout | Preserve the form and offer retry |
| Empty successful results | Show a genuine no-results state, not demo cards |
| Partial/unverified source data | Render uncertainty and source limitations prominently |

Never show raw exception traces, provider credentials, private prompts, or internal debugging output to end users.

## 8. Data Rendering Contract

The UI should map backend response fields to components without rewriting the meaning of the data.

### Scheme result object — required/optional guidance

| Field | UI use | Handling |
|---|---|---|
| `scheme_id` | Stable identity and detail lookup | Required in production responses; do not use array position as identity |
| `name` | Card/detail heading | Required for a renderable result |
| `summary` | Short description | Optional; if missing, omit the summary rather than invent it |
| `overall_status` | High-level state label | Render known status text; unknown values use a safe generic label |
| `conditions[]` | Eligibility breakdown | Preserve each backend status and explanation |
| `required_documents[]` | Document checklist | Show only records returned by the API, including uncertainty metadata |
| `sources[]` | Provenance cards | Render actual returned URLs and metadata only |
| `verification_status` | Trust/freshness signal | Do not convert missing status to `verified` |
| `last_checked_at` | Freshness display | Format only when valid; otherwise omit |

Avoid duplicating business logic in frontend formatters. Presentation code may format dates, labels, counts, and layout, but may not calculate eligibility from source text.

## 9. Security and Privacy Requirements for Components

- Do not store secrets in frontend files or bundles.
- Do not send model/search credentials from the browser.
- Use safe DOM APIs for user text and retrieved source content.
- Validate external URLs before rendering links; only support expected web protocols such as `https:` and, where explicitly needed for local development, `http:`.
- Do not display a result as verified based solely on a model response.
- Do not log natural-language requests or profile data unless there is a defined, privacy-reviewed need.
- Do not persist profile or checklist data unless that behaviour is explicitly implemented and explained to the user.
- Do not access privileged Supabase APIs from frontend JavaScript.
- Keep error messages helpful but free of internal tracebacks and secrets.

## 10. Accessibility and Responsive Behaviour

- Every input has a persistent programmatic label; placeholders are not a substitute.
- Required/optional state and validation errors are communicated in text.
- All controls work with keyboard input and have visible focus states.
- Menus, modals (if any), and checklists have logical focus behaviour.
- Announce loading and asynchronous result updates appropriately, using restrained `aria-live` regions where useful.
- Use semantic headings in order and semantic buttons/links for their correct purpose.
- Do not rely on colour, animation, or icons alone to convey status.
- Support zoom and narrow screens without horizontal page overflow.
- Respect `prefers-reduced-motion`.

## 11. Component Acceptance Checklist

The component implementation is ready for review when:

- [ ] All eight requested component groups are implemented or deliberately deferred with a documented reason.
- [ ] The navbar adapts to mobile and remains keyboard accessible.
- [ ] Discovery supports natural-language and/or guided input according to the agreed scope.
- [ ] Extracted profile values can be reviewed and corrected before matching when the backend returns them.
- [ ] Scheme cards and details show met, not met, and unknown conditions clearly.
- [ ] Required documents are source-backed where possible and their status is not assumed.
- [ ] Source cards display only real returned URLs and verification metadata.
- [ ] Loading, empty, API error, model/search unavailable, and unverified states are supported.
- [ ] API calls go through one shared client; the browser does not call Ollama directly.
- [ ] Proposed API fields/enums have been agreed with the AI/backend teammate before integration is treated as final.
- [ ] No fake scheme data is presented as real or live-verified.
- [ ] Responsive layout, keyboard use, labels, focus indicators, and status announcements are tested.
- [ ] No secrets or unnecessary personal data are exposed in browser code or logs.

## 12. Open Decisions to Confirm with the Team

Do not silently decide these where they affect the API or user experience:

1. **AI/backend API contract:** Are routes and response schemas already being defined by the teammate building AI? If so, replace the provisional examples above with that agreed contract before frontend integration.
2. **Request timing:** Will discovery return results in one HTTP response, or return a request/job ID that the frontend must poll or subscribe to? This document assumes neither as a final decision.
3. **Profile schema:** Which profile fields and allowed values are supported in the first release?
4. **Language support:** Which interface languages are in scope for the first release?
5. **Authentication and persistence:** Is sign-in needed, and should results or document checklist state be saved?
6. **Scheme detail route:** Should details be a separate page, a drawer, or an expanded panel? Choose based on the existing frontend structure and test usability.
7. **Search freshness:** Which source verification states and date fields will the backend actually return?
8. **Tailwind build:** Is the repository using a compiled Tailwind workflow or a prototype CDN approach?

Until these are resolved, keep the implementation modular and make assumptions visible. Never represent a proposed endpoint as an existing one.

## 13. Instructions for Antigravity

1. Read `prd.md`, `setup.md`, `architecture.md`, and this document before implementing components.
2. Inspect the repository and preserve working functionality before editing files.
3. Implement plain HTML, Tailwind CSS, and vanilla JavaScript; do not migrate to React without approval.
4. Create reusable component rendering/init functions and keep API calls in the shared API client.
5. Coordinate the provisional API contract with the AI/backend teammate before wiring the frontend to unconfirmed endpoints.
6. Keep eligibility decisions in the Python backend's deterministic rules engine.
7. Use verified backend source metadata and preserve uncertainty in every relevant component.
8. Build accessible loading, empty, error, and unverified states as first-class UI states.
9. Use mock data only for development fixtures, and label it clearly as demo data.
10. Add tests or repeatable checks for response rendering, unknown conditions, missing sources, bad URLs, and API errors.
11. Do not introduce a new dependency or paid service without explaining why and asking first.
12. When an implementation decision remains unresolved, surface the question instead of quietly choosing a consequential behaviour.

---

**End of `components.md`.**
