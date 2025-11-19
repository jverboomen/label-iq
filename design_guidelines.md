# Label iQ Design Guidelines

## Design Approach

**System Selection: Healthcare-Informed Material Design**

This medical information tool requires the trustworthiness and clarity of healthcare applications combined with Material Design's structured approach. Reference: Google Health studies, clinical portals like Epic MyChart, and FDA.gov's clean information architecture.

**Core Principles:**
- Trust through clarity: Every element serves information delivery
- Medical-grade readability: Optimize for scanning and comprehension
- Evidence-based hierarchy: Citations and disclaimers are first-class citizens
- Professional restraint: No playful elements in a regulated medical context

---

## Typography System

**Font Families:**
- **Primary (UI + Body):** Inter or System UI Stack
- **Monospace (Citations/IDs):** JetBrains Mono or SF Mono

**Type Scale:**
- **Page Title:** text-2xl font-semibold (Label iQ)
- **Section Headers:** text-lg font-semibold (e.g., "Selected Drug", "Your Question")
- **Body Text:** text-base leading-relaxed (questions, summaries)
- **Quotes:** text-base leading-relaxed italic (verbatim FDA text)
- **Labels:** text-sm font-medium (form labels, drug names)
- **Captions:** text-xs (citations, metadata)
- **Disclaimer:** text-sm font-medium (legal notice)

---

## Layout System

**Container Structure:**
- Max-width: `max-w-4xl` centered layout
- Padding: `px-6 py-8` on mobile, `px-8 py-12` on desktop
- Single-column flow for information clarity

**Spacing Primitives:**
Tailwind units: **2, 3, 4, 6, 8, 12**
- `gap-3` between form elements
- `space-y-6` between major sections
- `p-4` for card padding
- `py-2 px-3` for inputs
- `mb-8` between response components
- `mt-12` for disclaimer separation

---

## Component Library

### 1. Header
- Application title "Label iQ" with tagline: "Ask FDA Drug Labels in Plain Language"
- Subtitle: "Evidence-Based Answers from Official FDA Labels"
- Layout: Centered, `border-b` divider

### 2. Drug Selector
- **Label:** "Select Drug" (text-sm font-medium)
- **Dropdown:** Full-width select with 25 drugs, sorted alphabetically
- Style: `rounded-lg border` with `py-2 px-3` padding
- Displays: `drug_name_display` values

### 3. Question Input Section
- **Label:** "Your Question" (text-sm font-medium)
- **Textarea:** Multi-line input, `rows-3`, rounded corners
- **Placeholder:** "e.g., What are the warnings for this drug?"
- **Submit Button:** "Ask the Label" - primary action, `py-2 px-6 rounded-lg font-medium`

### 4. Response Panel (Conditional Display)

**A. Evidence Section (Quotes)**
- Header: "Evidence from FDA Label" (text-sm font-semibold)
- Each quote in bordered container with `pl-4 border-l-4` (blockquote style)
- Italic text formatting for verbatim passages
- `space-y-3` between multiple quotes

**B. Summary Section**
- Header: "Plain Language Summary" (text-sm font-semibold)
- Body text: 120-160 word paraphrase, `leading-relaxed`
- Clear paragraph structure

**C. Citation Bar**
- Display: `text-xs` monospace
- Format: "Source: [Drug Name] (Label ID: [label_id])"
- Subtle background (`bg-gray-50` equivalent)
- `px-3 py-2 rounded`

**D. Disclaimer**
- Fixed text: "⚠️ Educational only — not medical advice. Consult healthcare professionals for medical decisions."
- Style: `border-l-4` warning indicator, `px-4 py-3`
- Prominent but not alarming

**E. Empty State**
- Message: "Not stated in this label."
- Centered, muted styling when no answer found

### 5. Readability Scores (Bonus Feature)
- Collapsible section below main interface
- Table display: Drug | Flesch Score | Grade Level | SMOG | Word Count
- Header: "Label Readability Analysis" (text-lg font-semibold)
- Sortable columns with visual indicators

---

## Interaction Patterns

**Loading States:**
- Submit button shows "Analyzing..." during API call
- Disable form inputs while processing
- Simple text indicator (no spinners needed)

**Progressive Disclosure:**
- Response panel hidden until first query
- Readability section collapsed by default
- Expand/collapse with clear chevron icons

**Form Validation:**
- Require drug selection before submission
- Require non-empty question (min 10 characters)
- Inline validation messages below inputs

---

## Accessibility Standards

- Semantic HTML: `<select>`, `<label>`, `<textarea>`, `<blockquote>`
- ARIA labels on all form controls
- Focus states on all interactive elements using ring utilities
- Keyboard navigation for dropdown and buttons
- Screen reader announcements for response updates
- High contrast text (WCAG AA minimum)
- Touch targets minimum 44x44px

---

## Icons

**Library:** Heroicons (outline style)
- Dropdown chevron: `chevron-down`
- Expandable sections: `chevron-right` / `chevron-down`
- Warning (disclaimer): `exclamation-triangle`
- Search/Submit: `magnifying-glass`

---

## No Images Required

This is a utility application focused on text interaction. The interface is typography and form-driven with no hero sections or decorative imagery.

---

## Summary

This design creates a trustworthy, medical-grade interface that prioritizes information clarity over visual flourish. The structured response format (Evidence → Summary → Citation → Disclaimer) builds user confidence through transparency. Material Design's proven patterns ensure familiarity while healthcare-informed spacing and typography optimize for the serious task of understanding prescription drug information.