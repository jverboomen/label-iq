# Label iQ Design Guidelines - Hackathon Edition

## Design Approach

**Reference: Modern SaaS Excellence**
Drawing from Stripe's refined gradients, Linear's precision, and Vercel's dark sophistication. This hackathon demo balances medical credibility with cutting-edge visual design to impress judges while maintaining information clarity.

**Core Principles:**
- Tech-forward professionalism: Modern SaaS aesthetics with medical-grade trust
- Strategic visual impact: Sophisticated gradients and depth without clutter
- High contrast clarity: Dark mode optimized with exceptional readability
- Hackathon-ready: Visually striking first impression that showcases technical capability

---

## Color System

**Primary Palette:**
- **Deep Navy:** `#0A1628` (backgrounds)
- **Rich Cobalt:** `#1E3A8A` to `#2563EB` (primary actions, headers)
- **Vibrant Teal:** `#06B6D4` to `#14B8A6` (accents, highlights)
- **Slate:** `#1E293B` to `#334155` (elevated surfaces)

**Text Hierarchy:**
- Primary text: `#F8FAFC` (near-white, high contrast)
- Secondary text: `#94A3B8` (muted descriptions)
- Tertiary text: `#64748B` (labels, captions)

**Gradients (Subtle, Strategic):**
- **Hero:** Linear gradient from deep navy to midnight blue with teal accent glow
- **Cards:** Subtle slate-to-transparent overlays for depth
- **Buttons:** Cobalt to teal gradient on primary actions
- **Borders:** Teal gradient accents on focus states

**Semantic Colors:**
- Success: `#10B981` (emerald)
- Warning: `#F59E0B` (amber) 
- Critical disclaimer: `#EF4444` border with dark red background

---

## Typography

**Font Stack:**
- **Primary:** Inter (Google Fonts) - weights 400, 500, 600
- **Monospace:** JetBrains Mono for citations/IDs

**Scale:**
- Hero headline: `text-4xl font-semibold tracking-tight`
- Section headers: `text-2xl font-semibold`
- Subsections: `text-lg font-medium`
- Body: `text-base leading-7`
- Labels: `text-sm font-medium`
- Captions/citations: `text-xs tracking-wide`

---

## Layout System

**Spacing Primitives:** Tailwind units **3, 4, 6, 8, 12, 16**

**Container Structure:**
- Hero: Full-width gradient background with `max-w-5xl` content
- Main content: `max-w-4xl` centered
- Padding: `px-4 py-8` mobile, `px-8 py-16` desktop
- Section spacing: `space-y-12` for major blocks

---

## Component Architecture

### 1. Hero Section
**Layout:** Full-width gradient background (navy to midnight blue with teal glow)
- **Headline:** "Label iQ" - `text-5xl font-bold` with subtle teal gradient text effect
- **Tagline:** "AI-Powered FDA Drug Label Intelligence" - `text-xl text-slate-300`
- **Subtext:** "Denodo AI SDK Demo - Instant evidence-based answers from official FDA labels"
- **Visual treatment:** Floating card with frosted glass effect containing quick-start CTA
- **Background element:** Subtle grid pattern overlay with teal accent lines

### 2. Main Interface Card
**Elevated surface** with `bg-slate-800` and subtle border glow
- Rounded corners: `rounded-2xl`
- Padding: `p-8`
- Shadow: Multi-layer depth with teal glow accent

**Drug Selector:**
- Label with teal accent bar on left
- Custom-styled dropdown with gradient border on focus
- Hover state: Teal glow effect

**Question Input:**
- Frosted glass textarea with gradient border
- Focus state: Animated teal gradient border
- Placeholder with subtle animation hint

**Submit Button:**
- Gradient background (cobalt to teal)
- White text with medium weight
- Hover: Slight scale + brightness increase
- Loading state: Animated gradient shift

### 3. Response Panel
**Stacked card layout** with distinct visual hierarchy:

**Evidence Section:**
- Dark slate background with teal left border accent
- Quote text in lighter slate with italic styling
- Subtle inner glow on container

**Summary Section:**
- Slightly elevated from evidence card
- Clean typography with generous line-height
- Teal bullet points for list items

**Citation Bar:**
- Monospace text on darkest slate
- Inline badge styling with gradient border
- Copy button with teal accent

**Disclaimer:**
- Amber/red gradient left border (4px)
- Dark red-tinted background
- Warning icon with gradient fill

### 4. Readability Metrics (Bonus)
**Collapsible section** below main interface
- Dark header with teal expand/collapse icon
- Table with alternating row tints
- Gradient column headers
- Sortable with animated state changes

### 5. Footer
- FDA logo in monochrome white
- "Official FDA data via Denodo AI SDK" tagline
- Subtle separator line with teal gradient

---

## Images

**Hero Background:**
- Abstract visualization of pharmaceutical molecules/data nodes
- Dark blue/teal color scheme with glowing connections
- Blurred/defocused for text overlay readability
- Source: Generate abstract geometric pattern or use tech-forward stock imagery

**No additional images required** - focus on gradients and depth for visual impact

---

## Iconography

**Library:** Heroicons (outline, sized `w-5 h-5` or `w-6 h-6`)
- All icons inherit teal accent color
- Sparkle/AI icon for submit button
- Shield icon for FDA credibility badge
- Document icon for citations

---

## Accessibility

- WCAG AAA contrast ratios maintained with dark backgrounds
- Focus rings use teal gradient with high visibility
- Semantic HTML structure preserved
- Keyboard navigation with visible focus states
- ARIA labels on all interactive elements
- Screen reader announcements for dynamic content updates

---

## Summary

This design transforms Label iQ into a visually striking hackathon showcase while maintaining medical information credibility. The sophisticated dark color palette with strategic teal accents, subtle gradients, and depth layering creates a modern SaaS aesthetic that impresses judges. High contrast ensures readability, while the tech-forward visual treatment demonstrates the power of the Denodo AI SDK integration without compromising the serious nature of pharmaceutical data.