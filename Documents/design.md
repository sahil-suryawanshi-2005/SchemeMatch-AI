# SchemeMatch AI — Design System & UI Experience Guide

> **Product:** SchemeMatch AI  
> **Product concept:** SchemeMatch AI — Government Scheme Eligibility Reverse-Matcher  
> **Frontend:** HTML + Tailwind CSS + vanilla JavaScript  
> **Visual reference:** User-provided SchemeMatch AI landing-page screenshot  
> **Design direction:** Premium civic-tech; minimal, spacious, trustworthy  
> **Status:** Design requirements for Antigravity implementation

---

## 1. Purpose

This document defines the visual identity and user-experience rules for SchemeMatch AI. It should be read alongside:

- `prd.md` — product requirements and user journey.
- `setup.md` — local development and configuration.
- `architecture.md` — modular backend, hybrid scheme sourcing, AI adapter, deterministic eligibility engine, and Supabase.
- `components.md` — UI component behaviour and provisional API integration contracts.
- `security.md` — authentication, privacy, data minimisation, and secure integration requirements.

The database schema and database implementation belong to the teammate responsible for that work. This document does not define or override database tables, migrations, or ownership policies.

If a design requirement conflicts with a confirmed product or security requirement, preserve the product/security requirement and ask before making a consequential change.

## 2. Visual North Star

Use the uploaded screenshot as the primary visual reference. Preserve its simple, calm composition while making the final experience more polished and consistent.

### The desired feeling

- Trustworthy, clear, and human-centred.
- Modern civic-tech rather than a government portal imitation.
- Premium startup-quality finish without unnecessary visual effects.
- Easy to scan, including for users who are unfamiliar with government-scheme terminology.
- Content-first: eligibility facts, uncertainty, documents, and official sources matter more than decoration.

### Reference characteristics to preserve

- Soft, near-white background.
- Deep green/teal primary action.
- Charcoal-green headings and body text.
- Spacious hero section with a strong headline.
- Short supporting copy and clear primary action.
- Simple navigation and a restrained number of visual elements.
- Small trust cues near the main action.
- Minimal borders and restrained visual hierarchy.

### Improvements over the reference

- More consistent type scale and line-height.
- Refined cards with subtle borders and soft shadows.
- Clear focus, hover, loading, error, and selected states.
- More deliberate spacing and responsive behaviour.
- Better readability and accessibility.
- Consistent patterns for eligibility states and source verification.
- Subtle transitions only where they improve feedback.

Do not copy incidental image artefacts, screen glare, photographic noise, or any implementation flaws from the screenshot.

---

## 3. Brand Identity

### Product name

Use **SchemeMatch AI** as the user-facing product name.

The project concept may be described as **SchemeMatch AI — Government Scheme Eligibility Reverse-Matcher** in internal documentation or project presentations. Do not display both names as competing primary brands in the same interface.

### Brand voice

- Clear and respectful.
- Helpful, not bureaucratic.
- Confident about verified information, transparent about uncertainty.
- Use short sentences and familiar language.
- Avoid guarantees such as “You are definitely eligible” or “Guaranteed approval.”

### Indian civic identity

Use subtle Indian civic-tech cues through the content and restrained accent details where useful. Do not use heavy tricolour decoration, imitation government seals, national emblems, or styling that could imply official government affiliation.

The product must not suggest that SchemeMatch AI is an official government department unless that status is explicitly established by the product owner.

---

## 4. Colour System

These are the initial design tokens. The exact colours in the supplied screenshot cannot be sampled reliably from the photographed display, so these values are a considered approximation of the requested direction—not exact pixel measurements.

| Token | Initial value | Use |
|---|---|---|
| `--color-primary` | `#075E50` | Main CTA, active navigation, key interactive accents |
| `--color-primary-hover` | `#064C41` | Hover/pressed primary controls |
| `--color-primary-soft` | `#E5F1ED` | Selected states and quiet teal surfaces |
| `--color-background` | `#F7F8F5` | Main page background |
| `--color-surface` | `#FFFFFF` | Cards, forms, menus, dialogs |
| `--color-surface-muted` | `#F0F3EF` | Secondary panels and subtle inset areas |
| `--color-text` | `#202923` | Main headings and body text |
| `--color-text-muted` | `#5D6962` | Supporting text and metadata |
| `--color-border` | `#DDE4DE` | Card edges, field borders, dividers |
| `--color-focus` | `#0B7563` | Keyboard focus ring, with sufficient contrast |
| `--color-accent` | `#D99A42` | Rare, restrained highlights only |

### Status colours

Eligibility and source statuses must not rely on colour alone. Pair every status with a readable text label and, where useful, an icon.

| Status | Suggested treatment | Rule |
|---|---|---|
| Met / positive | Muted green surface and dark green text | Only for a condition supported by verified structured rules |
| Not met | Muted red surface and dark red text | Explain the unmet condition plainly |
| Unknown / needs confirmation | Muted amber surface and dark amber text | Never style as success or imply that the condition is satisfied |
| Unverified / stale source | Neutral or muted amber treatment | Clearly state the source verification state |
| Informational | Soft teal/neutral treatment | Do not confuse general information with eligibility approval |

Before release, check actual foreground/background contrast for text, controls, hover states, and status badges. Adjust token values if required for accessibility while preserving the overall palette.

### Colour usage rules

- Use deep teal for primary actions, not every decorative element.
- Keep most page surfaces neutral and light.
- Use the accent colour sparingly.
- Avoid large gradients, neon colours, and rainbow status treatments.
- Avoid using red/green alone to distinguish conditions.
- Keep colour tokens centralised rather than hardcoding unrelated colours across pages.

---

## 5. Typography

### Font family

Use **Inter** as the primary typeface.

Recommended CSS fallback:

```css
font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

If Inter is loaded from an external font provider, document that dependency and provide a system-font fallback. Do not promise offline font availability unless the font is bundled locally.

### Type scale

Use a consistent, responsive type scale. These are starting values, not rigid rules for every screen.

| Role | Desktop starting size | Weight | Guidance |
|---|---:|---:|---|
| Hero heading | `clamp(2.5rem, 5vw, 4rem)` | 650–750 | Strong, compact, readable; avoid overly long line lengths |
| Page heading | `2rem`–`2.75rem` | 650–750 | One clear heading per page |
| Section heading | `1.375rem`–`1.75rem` | 600–700 | Clear section hierarchy |
| Card heading | `1.125rem`–`1.25rem` | 600–650 | Distinct from supporting copy |
| Body | `1rem` | 400–450 | Comfortable line-height, usually around 1.5–1.7 |
| Supporting text | `0.875rem`–`0.9375rem` | 400–500 | Maintain readable contrast |
| Labels / metadata | `0.8125rem`–`0.875rem` | 500–600 | Do not make essential information too small |

### Typography rules

- Prefer readable sentence case over all caps.
- Use clear line-height and a comfortable text measure.
- Avoid overly thin weights for body text.
- Do not use extremely small text for disclaimers, eligibility explanations, or source information.
- Keep long headings and body copy responsive.
- Use tabular numerals only when comparing numeric data, where helpful.

---

## 6. Layout, Grid, and Spacing

### Layout principles

- Use generous whitespace and clear content groupings.
- Use a centred content container with a readable maximum width.
- Keep line lengths comfortable, especially for explanatory text.
- Align cards and form fields consistently.
- Avoid adding panels, stats, charts, or dashboard widgets without a real user need.
- Make the most important user action visually obvious.

### Initial layout tokens

Use a consistent spacing scale, aligned to Tailwind's spacing utilities where possible:

- `4px` — tiny icon/text gap.
- `8px` — compact inline spacing.
- `12px` — related control spacing.
- `16px` — default component gap.
- `24px` — card internal group spacing.
- `32px` — section spacing on compact layouts.
- `48px`–`64px` — major section separation.
- `80px`–`112px` — spacious desktop hero/section separation where appropriate.

These values are guidance; use responsive spacing instead of applying large fixed gaps to small screens.

### Containers

- Use a shared max-width container for navigation and main content.
- Keep the hero text narrower than the overall page container.
- Use full width only where it improves the experience, such as a mobile form or a results list.
- On wide screens, avoid stretching scheme details into excessively long lines.

---

## 7. Cards, Forms, Buttons, and Surfaces

### Cards

Use refined cards with:

- White surface on the soft off-white page background.
- A subtle border.
- A soft, low-contrast shadow only when it adds separation.
- Rounded corners that feel modern without looking inflated.
- Consistent internal padding.
- Clear title, supporting copy, status, and action hierarchy.

Do not put every paragraph inside a card. Use cards to group information that belongs together.

### Buttons

Define three clear button levels:

1. **Primary:** deep teal fill, high-contrast text, clear action label.
2. **Secondary:** neutral or white surface with a visible border.
3. **Tertiary/text:** minimal background for low-priority actions.

Rules:
- Use action-specific labels such as “Find matching schemes” or “Review details.”
- Avoid vague labels where a clearer action is possible.
- Provide hover, active, disabled, loading, and keyboard-focus states.
- Do not make a disabled/loading button look clickable.
- Ensure the hit target is comfortable on touch screens.

### Form controls

- Use explicit labels rather than relying on placeholder text.
- Explain why a sensitive or potentially confusing field is requested.
- Mark optional fields clearly.
- Use inline validation messages that identify the problem and how to fix it.
- Preserve user-entered values after recoverable errors.
- Display unknown or unconfirmed values explicitly; never silently fill them with defaults.
- Do not require document uploads in the core scheme-discovery flow.

### Borders and shadows

- Prefer borders for structure and shadows for subtle elevation.
- Keep shadows soft and restrained.
- Use consistent radii and border colours.
- Avoid heavy outlines on every element or exaggerated floating-card effects.

---

## 8. Landing Page Design

The reference screenshot uses a search-first hero. Keep this as the preferred landing-page direction.

### Recommended structure

1. **Navigation**
   - SchemeMatch AI wordmark/name.
   - Short descriptor such as “Find schemes. Understand eligibility.”
   - Minimal links to real, implemented pages.
   - Clear sign-in/account state consistent with `security.md`.

2. **Hero eyebrow**
   - Short description of the product's purpose.
   - Do not imply official government affiliation or guaranteed AI accuracy.

3. **Main headline**
   - Clear, benefit-led heading.
   - Suggested copy: “Find government schemes that fit your circumstances.”
   - Use a readable line break and avoid overly long text.

4. **Supporting copy**
   - Explain that users can explore relevant schemes, understand conditions, and review document requirements.
   - Keep it concise and avoid unsupported claims of complete scheme coverage.

5. **Primary action**
   - Use a strong teal CTA such as “Get started.”
   - Because login is required by the confirmed security decision, route unauthenticated users through the agreed Supabase Auth flow before protected discovery.
   - Do not show a guest-discovery path unless the product owner changes that decision.

6. **Secondary action**
   - Use “Sign in” or “Create account” based on the confirmed registration policy.
   - The exact registration model remains open; do not invent the final auth flow.

7. **Trust cues**
   - Small, restrained points such as “Clear eligibility explanations,” “Source links,” and “Document checklist.”
   - Only claim source verification or freshness when the underlying implementation actually supports it.

### Hero rules

- Avoid unnecessary hero illustrations that push the main action below the fold.
- Do not add invented usage statistics, user counts, success rates, or government endorsements.
- Keep the main CTA visible on common laptop and mobile viewport sizes.
- Use a subtle entrance transition only if it does not delay access or reduce accessibility.

---

## 9. Scheme Discovery and Results Experience

### Discovery form

- Present a clear prompt explaining what information is useful.
- Keep the first step approachable and avoid overwhelming users with a long form.
- Use progressive disclosure for optional or detailed questions.
- Explain that the user can leave unknown details unanswered where supported.
- Do not send private profile details to external search services; follow `security.md`.
- Make the submit action and processing state clear.

### Profile/extracted-data review

- Use simple, consistent form rows or cards.
- Show whether a value was provided by the user, extracted, or remains unknown when that metadata is available.
- Make correction actions easy to find.
- Do not style unconfirmed AI-extracted values as authoritative facts.

### Scheme result cards

Each card should prioritise:
1. Scheme name and issuing authority, when available.
2. Plain-language summary.
3. Overall result state.
4. Short explanation for the match.
5. Counts/previews of met, unmet, and unknown conditions, where supported.
6. Source/verification status.
7. Clear action to open details.

Do not display an unexplained eligibility percentage. Do not imply that a potential match is official approval.

### Scheme details

Use clear sections for:
- Overview.
- Eligibility conditions.
- Unknown or unmet conditions.
- Required documents.
- Official sources and available freshness metadata.
- Next steps and the reminder to confirm final requirements with the responsible authority.

Make the page easy to scan on mobile without hiding important caveats behind inaccessible interactions.

---

## 10. Eligibility and Source Status Visuals

Use consistent status labels throughout the product:

- **Met** — the known information satisfies a reviewed structured condition.
- **Not met** — the known information does not satisfy a reviewed structured condition.
- **Unknown / needs confirmation** — required information is missing, ambiguous, or insufficiently verified.
- **Unverified source** — the scheme rule/source has not passed the defined review process.
- **Stale source** — freshness checks indicate that the information may need rechecking, according to the implemented policy.

Rules:
- Pair each status with text and optionally an icon; never use colour alone.
- Unknown must not look like success.
- Show explanations and next steps for unknown conditions.
- Do not label a user officially eligible.
- Do not invent verification dates or official sources.
- Preserve source provenance and uncertainty from the backend response through to the UI.

---

## 11. Navigation and Authentication States

Authentication is required according to `security.md`.

Design these states:
- Signed-out visitor.
- Sign-in screen.
- Registration screen only if the agreed registration policy allows it.
- Loading/verifying session.
- Authenticated user navigation.
- Expired session.
- Sign-out confirmation or completion state, as appropriate.
- Safe auth error and recovery states.

Rules:
- Do not expose protected profile or result content before the session is verified.
- Make sign-in and account actions easy to locate without overpowering the product.
- Do not store credentials or tokens in visible UI state, URLs, or logs.
- Do not invent registration, email verification, or password recovery details until the auth policy is confirmed.

---

## 12. Responsive Design

Design and test for:
- Small mobile screens.
- Larger phones.
- Tablets.
- Standard laptops.
- Wide desktop displays.

Rules:
- Start with a functional mobile layout and enhance it for larger screens.
- Collapse navigation into a keyboard-accessible mobile menu.
- Keep buttons and form controls easy to tap.
- Stack cards on narrow screens and use columns only when they improve scanning.
- Avoid horizontal overflow.
- Maintain readable text and sensible spacing at all sizes.
- Keep status labels, source links, and important disclaimers visible.
- Test long scheme names, long source URLs, validation messages, and empty states.

Do not treat responsiveness as only shrinking the desktop layout.

---

## 13. Motion and Interaction

Use subtle, purposeful transitions for:
- Button hover/press feedback.
- Card hover where the card is interactive.
- Expanding/collapsing sections.
- Loading indicators.
- Small state changes after a user action.

Rules:
- Prefer short transitions and restrained easing.
- Avoid parallax, looping decorative animation, excessive blur, or distracting animated backgrounds.
- Do not delay navigation or essential actions for animation.
- Honour `prefers-reduced-motion`.
- Never use animation as the only way to communicate loading, errors, or success.
- Ensure hover interactions have keyboard/touch equivalents.

---

## 14. Accessibility Requirements

- Use semantic HTML landmarks and a logical heading hierarchy.
- Associate every input with a visible label.
- Make all interactive elements keyboard-accessible.
- Show a visible focus indicator.
- Check text, control, and status contrast.
- Do not rely on colour alone for eligibility or source state.
- Use clear inline errors and announce important asynchronous state changes accessibly.
- Keep interactive target sizes comfortable on touch screens.
- Support browser zoom and text resizing without clipping essential information.
- Honour reduced-motion preferences.
- Use meaningful link text, especially for official source links.
- Avoid unnecessary ARIA when native semantic HTML provides the required behaviour.

---

## 15. Implementation Guidance for Antigravity

### Stack and code conventions

- Use **HTML + Tailwind CSS + vanilla JavaScript** as specified in the current project direction.
- Do not introduce React or another frontend framework without explicit approval.
- Inspect the existing repository before adding, moving, or replacing files.
- Keep design tokens centralised and reusable.
- Reuse the component responsibilities in `components.md`.
- Keep API communication inside the shared API client; do not call Ollama or search providers from the browser.
- Render user, model, PDF, and search content safely; follow `security.md`.
- Do not embed secrets in frontend code.
- Avoid adding large dependencies just for small visual effects.
- Keep visual styling consistent across landing, auth, discovery, results, and details views.

### Tailwind token implementation

Define the palette, font family, radii, shadows, and other repeatable values in one central configuration/style layer appropriate to the repository's installed Tailwind version and build workflow.

Do not scatter unrelated hex values throughout HTML files. If a token must change, the change should be possible centrally.

### Build in stages

1. Inspect existing project files and current Tailwind setup.
2. Establish shared colour, typography, spacing, and component tokens.
3. Build the responsive app shell and landing page.
4. Implement authentication states consistent with `security.md`.
5. Build discovery, profile review, result cards, details, eligibility breakdown, source cards, and document checklist.
6. Add loading, empty, error, and unverified states.
7. Test keyboard access, reduced motion, responsive layouts, and contrast.
8. Integrate real API responses only after the provisional contracts in `components.md` have been confirmed.
9. Clearly label any demo fixtures; never present fake scheme results as live verified information.

---

## 16. Definition of Done

The design implementation is ready for review when:

- The visual direction clearly reflects the supplied reference without copying its display artefacts.
- The deep-teal, soft off-white, and charcoal-green palette is consistent.
- Inter typography and fallbacks are implemented cleanly.
- Spacing, borders, shadows, and radii are consistent across pages.
- The landing page has a clear headline and primary action.
- Auth states align with the confirmed login-required decision.
- All required components from `components.md` have consistent visual states.
- Eligibility, uncertainty, and verification statuses are understandable without colour alone.
- Mobile, tablet, and desktop layouts are usable.
- Keyboard focus, labels, contrast, and reduced motion have been checked.
- No fake metrics, false official affiliations, fabricated sources, or guaranteed-eligibility claims appear.
- The browser does not call AI/search services directly or expose secrets.
- Database ownership and schema decisions remain with the designated teammate.

---

## 17. Open Decisions — Do Not Silently Assume

These decisions are still not confirmed by the current project documents:

1. **Registration policy:** open sign-up, verified email, invitation-only, or another approach.
2. **Authentication screens:** exact fields, recovery flow, and verification steps for the chosen Supabase Auth configuration.
3. **Logo/wordmark:** text-only SchemeMatch AI wordmark or a custom icon plus wordmark.
4. **Language selection:** English-only initially or multilingual UI support.
5. **Dark mode:** not required by this initial design; add it only if the product owner confirms.
6. **Final font delivery:** external font loading versus bundling Inter locally.
7. **Production Tailwind workflow:** confirm against the repository's actual Tailwind version and build setup.
8. **Brand assets:** final logo files, favicon, and illustrations if any.

Use the confirmed design choices as the implementation baseline. Ask the product owner before making consequential choices above, and keep the UI modular so unresolved decisions can be changed without redesigning the entire app.

---

**End of design guide**

This file defines the intended visual and interaction system. It does not claim that the design has already been implemented, tested, or audited for accessibility.
