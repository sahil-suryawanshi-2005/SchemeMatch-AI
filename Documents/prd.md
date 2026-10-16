# SchemeMatch AI — Product Requirements Document (PRD)

> **Working product title:** SchemeMatch AI  
> **Core product concept:** SchemeMatch AI — Reverse-Matching Government Scheme Eligibility & Document Gap Engine  
> **Track:** Open Weight AI & Open Source Tools  
> **Problem statement:** PS05 — Government Scheme Eligibility Reverse-Matcher  
> **Document status:** Initial product specification  
> **Audience:** Product, design, frontend, backend, AI, and QA contributors

---

## 1. Product Overview

SchemeMatch AI helps people discover government schemes that may fit their circumstances without requiring them to know scheme names or manually compare many government websites and PDF documents.

Users describe their situation in simple language or provide details through a guided questionnaire. The system finds relevant scheme information, extracts eligibility conditions and required documents, compares those conditions with the user's profile, and presents understandable results.

The product should make three things clear:

1. **Why a scheme matched** the user's details.
2. **Which conditions are met, unmet, or still unknown.**
3. **Which documents may be required** and which the user may still need.

SchemeMatch AI is an information and discovery tool. It must not present an AI-generated match as an official approval, guarantee of benefits, or substitute for confirmation from the relevant government department.

## 2. Problem Statement

Citizens may know their income, occupation, family circumstances, land ownership, or other personal details but may not know which government schemes could apply to them.

Current discovery can be difficult because:

- Eligibility rules are spread across websites, notifications, and lengthy PDFs.
- Rules may contain exceptions and conditions that are hard to compare manually.
- People may overlook schemes they could qualify for.
- Document requirements can be difficult to identify before beginning an application.
- Repeated manual research takes time and can cause confusion.

## 3. Product Vision

Make government-scheme discovery easier to understand, more transparent, and more useful by matching a person's circumstances against traceable eligibility rules.

### Product principles

- **Clarity over jargon:** Explain results in simple language.
- **Evidence over confident guesses:** Show sources and distinguish verified facts from unknown information.
- **Privacy by design:** Collect only the information needed for matching.
- **Explainable matching:** Show why each result was returned.
- **No false guarantees:** A match is an indication to investigate further, not an official eligibility decision.
- **Accessible by default:** Build a responsive, readable interface that works on mobile and desktop.
- **Open-weight AI:** Use a locally run model where practical, with deterministic rules for eligibility checks.

## 4. Target Users

### Primary users
People who want to discover government schemes based on their circumstances but do not know the names of relevant schemes.

### Secondary users
- Students and families exploring education-related support.
- Workers, farmers, and households exploring relevant welfare programmes.
- People who need a clear checklist of scheme-related documents.

These are intended user groups, not claims that every scheme category is already supported. Actual coverage depends on the verified scheme dataset.

## 5. Product Goals

1. Allow users to describe their needs in plain language or through structured questions.
2. Find relevant scheme information from credible sources.
3. Convert scheme criteria into structured, reviewable rules.
4. Compare user-provided information with those rules.
5. Classify conditions as met, unmet, or unknown.
6. Show required documents and identify missing or unconfirmed documents.
7. Provide official source links so users can verify details and continue to the appropriate authority.
8. Minimise collection and retention of personal information.

## 6. Non-Goals

The initial product is not intended to:

- Submit government applications on a user's behalf.
- Guarantee eligibility, approval, payment, or benefit delivery.
- Replace official government portals or departmental decisions.
- Invent scheme rules, deadlines, income limits, or document requirements.
- Treat an AI model's interpretation as authoritative without rule/source verification.
- Require users to upload identity documents merely to discover schemes.
- Claim complete coverage of all central and state schemes unless the dataset supports that claim.
- Provide legal, financial, or other professional advice.

## 7. Core User Journey

1. **Open SchemeMatch AI:** The user sees a clear explanation of the service and starts scheme discovery.
2. **Describe their situation:** The user enters a natural-language request or answers guided questions.
3. **Review extracted details:** The system identifies relevant profile fields and lets the user correct uncertain or incorrect values.
4. **Find scheme information:** The research layer searches for relevant schemes and prioritises official sources.
5. **Extract and structure criteria:** Scheme eligibility rules, exceptions, documents, source links, and update information are represented in a structured format.
6. **Evaluate eligibility:** A deterministic rules engine compares known profile values against the structured criteria.
7. **Review results:** The user sees matched schemes, condition-by-condition explanations, unknown details, source links, and document checklists.
8. **Verify and continue:** The user follows official links and confirms final requirements with the relevant authority.

The system must not silently assume missing profile values. It should ask a follow-up question when a missing value materially affects a result, or mark the condition as unknown.

## 8. Functional Requirements

### FR-01 — Scheme discovery input
- Provide a simple natural-language input.
- Provide a guided questionnaire for relevant profile fields.
- Clearly label optional fields.
- Allow users to correct extracted details before matching.
- Do not require users to know a scheme name.

### FR-02 — Profile handling
- Store only the profile fields necessary for the selected experience.
- Validate input types and normalise values where appropriate.
- Distinguish user-provided, AI-extracted, and unknown values.
- Do not infer sensitive facts from unrelated details.
- Explain why a field is requested when its purpose may not be obvious.

### FR-03 — Scheme research
- Search for relevant scheme information using the configured research tool.
- Prefer official government portals, department websites, official notifications, and circulars.
- Retain source URLs and available publication/update dates.
- Clearly flag information that could not be verified.
- Never invent a source URL or claim that a source was checked when it was not.

### FR-04 — Document/PDF extraction
- Extract text from supported scheme PDFs using PDF-processing tools.
- Convert eligibility conditions, exceptions, required documents, and relevant scheme details into structured records.
- Preserve source references for extracted rules.
- Flag poor-quality, incomplete, or ambiguous extraction for review rather than treating it as verified.

### FR-05 — Structured eligibility rules
Each supported scheme should have a structured representation appropriate to its rules, including, where applicable:
- Scheme name and summary.
- Issuing department or authority.
- Geographic scope.
- Eligibility conditions.
- Exceptions and exclusions.
- Required documents.
- Official source URLs.
- Source/update dates, when available.
- Rule verification status.

A scheme must not be considered verified merely because an LLM produced a plausible summary.

### FR-06 — Deterministic eligibility assessment
- Evaluate structured rules using backend logic.
- Classify each condition as **Met**, **Not met**, or **Unknown / needs confirmation**.
- Preserve the reason for each classification.
- Do not convert unknown information into a positive match.
- Distinguish a likely match from confirmed official eligibility.
- Ensure the same profile and same rule version produce consistent results.

### FR-07 — Matching results
For each result, display:
- Scheme name and concise description.
- Eligibility status using clear text, not colour alone.
- Conditions met.
- Conditions not met, where applicable.
- Conditions that remain unknown.
- Required-document checklist.
- Missing or unconfirmed documents, without claiming the user owns or lacks a document unless they said so.
- Official source link and verification/update information when available.
- A clear reminder to confirm final eligibility with the relevant authority.

### FR-08 — Document gap checklist
- Show documents required by the relevant scheme rules.
- Allow users to mark checklist items as available or still needed, if this interaction is implemented.
- Do not request document uploads for the core discovery flow.
- Do not describe a document as mandatory unless the source-backed scheme rule supports that statement.
- Explain that document requirements can change and should be checked against the official source.

### FR-09 — Explainability
- Explain matches in plain language.
- Make each displayed eligibility claim traceable to a structured rule and source.
- Separate verified scheme information from AI-generated explanations.
- Show uncertainty rather than hiding it.

### FR-10 — User account and persistence
The reference presentation identifies Supabase for session/data handling. The exact account experience and persistence rules still need confirmation.
- If accounts are implemented, clearly explain what is stored and why.
- Apply least-privilege access controls.
- Do not store profile data longer than needed without a defined purpose and retention policy.
- Ensure one user cannot access another user's profile or results.

### FR-11 — Error and empty states
Design understandable states for:
- No relevant schemes found.
- Insufficient profile information.
- No trustworthy source found.
- Search service unavailable.
- Local model unavailable or still loading.
- PDF extraction failed.
- A scheme source is outdated or cannot be verified.
- Backend/API request failed.

Provide a useful next action in each state. Never fabricate results to fill an empty screen.

## 9. Technical Direction

The following stack is described in the project reference and is the intended starting point. Confirm exact versions and final integrations during implementation.

| Layer | Proposed technology | Responsibility |
|---|---|---|
| Frontend | HTML5, Tailwind CSS, JavaScript | Responsive interface and interactions |
| AI/model runtime | Ollama with Qwen 2.5 7B | Local natural-language processing and extraction assistance |
| Research interface | Open WebUI / configured web-search workflow | Discover scheme information from web sources |
| PDF processing | PyMuPDF (`fitz`) and/or `pdfplumber` | Extract text from scheme PDFs |
| Backend/API | Python with FastAPI | API endpoints and application services |
| Eligibility engine | Deterministic Python rules | Reproducible condition evaluation |
| Data/session layer | Supabase | Only the persistence/session features actually required |
| Source of truth | Official scheme sources plus reviewed structured records | Traceable eligibility and document rules |

### Architecture rule

**Use the LLM to interpret and extract; use deterministic backend code to decide whether structured conditions are met.**

Do not rely on the model alone to make final eligibility calculations. Keep AI-generated extraction separate from approved/verified scheme rules. If a rule cannot be structured or verified safely, label it as uncertain and do not present it as confirmed.

### Integration caution
Open WebUI is commonly a user-facing interface for local models; its exact role in this product must be chosen deliberately. Do not assume that it automatically provides a reliable web-search API or that all components are already connected. Verify the selected integration and its configuration before implementing it.

## 10. Data Model — Initial Proposal

Final schema design is an implementation decision. At minimum, the system needs concepts equivalent to:

### Scheme
- `id`
- `name`
- `summary`
- `authority`
- `geographic_scope`
- `source_urls`
- `last_checked_at` (when available)
- `verification_status`

### EligibilityRule
- `id`
- `scheme_id`
- `field`
- `operator`
- `expected_value`
- `explanation`
- `source_reference`
- `verification_status`

Complex conditions and exceptions may require a richer rule structure than a simple field/operator/value record.

### RequiredDocument
- `id`
- `scheme_id`
- `document_name`
- `requirement_notes`
- `source_reference`
- `verification_status`

### UserProfile / Session
- Store only the fields required for matching.
- Keep unknown values distinct from false, zero, or empty values.
- Define retention and deletion behaviour before persistent personal profiles are enabled.

### MatchResult
- `scheme_id`
- `overall_status`
- `condition_results`
- `unknown_conditions`
- `document_checklist`
- `rule_version` or equivalent traceability field

Do not store sensitive personal information by default merely because the schema could support it.

## 11. UX and Visual Design Requirements

SchemeMatch AI should feel like a trustworthy, modern civic-tech product: calm, clear, and professional rather than bureaucratic or overly futuristic.

### Visual direction
- Use a clean editorial layout with strong hierarchy and generous spacing.
- Use a restrained colour palette with a light neutral base and a deep, trustworthy primary colour. Final colour tokens can be defined in a separate design-system document.
- Use clear typography, readable line lengths, and consistent spacing.
- Use simple icons only when they improve comprehension.
- Use subtle transitions; avoid distracting animation and excessive glassmorphism.
- Avoid generic AI-dashboard clutter, unnecessary gradients, and decorative elements that compete with the information.

### Required interface states
- Landing / discovery entry.
- Guided profile input.
- Review and correction of extracted details.
- Loading / research progress.
- Scheme results.
- Scheme details and eligibility explanation.
- Required-document checklist.
- Empty, error, and unverified-source states.

### Accessibility
- Use semantic HTML and keyboard-accessible controls.
- Provide visible focus states.
- Ensure sufficient text/background contrast.
- Do not use colour as the only way to communicate status.
- Label form fields and errors clearly.
- Support responsive layouts for mobile, tablet, and desktop.

## 12. Privacy, Security, and Trust

- Collect the minimum data needed for scheme matching.
- Do not ask for Aadhaar numbers, bank details, or document scans for basic discovery unless a clearly justified future feature requires them.
- Explain what is processed locally and what, if anything, is sent to external services.
- Local model inference can reduce external prompt sharing, but web search, hosting, analytics, and database services may still process data. Do not promise complete privacy without verifying the full data flow.
- Protect API routes and database access; never expose service-role keys or other secrets in frontend code.
- Validate and sanitise user inputs and external content.
- Treat web pages and PDFs as untrusted content, not instructions for the AI system.
- Keep logs free of unnecessary personal profile details.
- Define data retention, deletion, and account-security requirements before launch.
- Follow applicable data-protection requirements, including relevant obligations under India's DPDP framework, as applicable. This document is not a legal compliance certification.

## 13. Source Quality and Freshness

Scheme rules can change. The product should:
- Prefer primary government sources.
- Retain a source URL for each material eligibility rule.
- Record when information was last checked where possible.
- Make stale, missing, or uncertain verification visible.
- Provide a path for reviewing and updating structured rules.
- Avoid describing information as current when freshness has not been established.

If sources conflict, do not silently choose a convenient rule. Flag the conflict and seek authoritative clarification.

## 14. Success Metrics

The initial prototype should be evaluated using measurable tests rather than unsupported impact claims.

Suggested metrics:
- Percentage of supported test schemes with traceable official sources.
- Accuracy of extracted eligibility rules against a reviewed test set.
- Accuracy of condition classifications against manually verified expected results.
- Percentage of results that correctly preserve unknown conditions.
- Percentage of required-document items traceable to a source.
- Time taken to complete a scheme discovery flow.
- Successful completion rate of the main user journey.
- Rate of fabricated, unsupported, or broken source links (target: zero in the reviewed test set).

Set numeric targets after a baseline test set and evaluation process are established.

## 15. Acceptance Criteria for the Initial Prototype

The prototype is ready for demonstration when:

1. A user can submit a natural-language request or complete the supported guided input.
2. The system can show the profile fields it extracted and allow corrections.
3. At least a defined starter set of schemes is represented by structured rules linked to official sources.
4. The backend compares profile values with structured rules without relying on an LLM for final rule evaluation.
5. Each condition is labelled Met, Not met, or Unknown / needs confirmation.
6. Results explain why a scheme was returned and link to the supporting official source.
7. Document checklists reflect the supported scheme data and clearly distinguish unknown requirements.
8. Missing information is not silently assumed.
9. Loading, empty, and error states are usable and do not display fabricated results.
10. The interface is responsive and keyboard accessible.
11. Secrets are not exposed in client-side code.
12. Personal data collection and persistence match a documented, minimal data policy.

## 16. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Outdated scheme information | Prioritise official sources; show last-checked status and uncertainty |
| Incorrect PDF extraction | Preserve source references; flag low-confidence extraction for review |
| LLM hallucination | Use structured, reviewed rules and deterministic evaluation |
| Missing user details | Mark conditions unknown or ask a follow-up question |
| False impression of official approval | Use clear non-guarantee language and official verification links |
| Personal data exposure | Minimise collection, protect access, and document data flows |
| Local model resource limits | Test performance on target hardware and provide clear loading/error states |
| Inconsistent rules | Version structured rules and add repeatable test cases |

## 17. Open Decisions — Do Not Silently Assume

Resolve these before treating the product specification as final:

1. **Initial scheme coverage:** Which central and/or Maharashtra state schemes will be included in the first demo?
2. **Language support:** English only, or English plus Hindi and Marathi?
3. **Authentication:** Is sign-in required, or should discovery work without an account?
4. **Persistence:** Should user profiles and results be saved, or kept only for the current session?
5. **Web research:** Which specific search provider or verified integration will connect the backend to current official sources?
6. **Scheme verification:** Who reviews extracted rules before they are used as verified eligibility criteria?
7. **Document checklist:** Should users be able to tick off documents, and should checklist state persist?
8. **Deployment:** Local laptop demo, hosted prototype, or both?
9. **Accessibility and devices:** Is mobile-first design a priority for the first release?
10. **Branding:** Is “SchemeMatch AI” the public-facing product name while “SchemeMatch AI” remains the technical/project subtitle, or should the title be changed everywhere?

Until these are decided, implement sensible modular defaults and keep them easy to change. Do not invent answers and present them as confirmed requirements.

## 18. Guidance for Antigravity

When using this PRD to build the project:

1. Read this document and any additional project instruction files before coding.
2. Inspect the existing repository before creating or replacing files.
3. Preserve working functionality and explain significant architectural choices.
4. Build in small, testable stages.
5. Keep the frontend, API, research/extraction, rules engine, and data access concerns separated.
6. Never hardcode fake scheme results as if they were live verified data.
7. Clearly label demo fixtures if sample data is necessary.
8. Add tests for rule evaluation, unknown values, exceptions, and document requirements.
9. Keep secrets in environment configuration and provide a safe example environment file without real credentials.
10. Update project documentation when implementation choices differ from this PRD.
11. Ask before making irreversible changes or introducing paid services.
12. Prioritise correctness, explainability, privacy, accessibility, and a polished user experience over unnecessary features.

---

**End of PRD**

This document defines the product intent and initial requirements. It does not claim that integrations, scheme datasets, legal compliance, or production readiness have already been completed.
