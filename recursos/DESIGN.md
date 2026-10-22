---
name: Executive Precision
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#45474c'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#75777d'
  outline-variant: '#c5c6cd'
  surface-tint: '#545f73'
  primary: '#091426'
  on-primary: '#ffffff'
  primary-container: '#1e293b'
  on-primary-container: '#8590a6'
  inverse-primary: '#bcc7de'
  secondary: '#0058be'
  on-secondary: '#ffffff'
  secondary-container: '#2170e4'
  on-secondary-container: '#fefcff'
  tertiary: '#00190e'
  on-tertiary: '#ffffff'
  tertiary-container: '#00301e'
  on-tertiary-container: '#00a472'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e3fb'
  primary-fixed-dim: '#bcc7de'
  on-primary-fixed: '#111c2d'
  on-primary-fixed-variant: '#3c475a'
  secondary-fixed: '#d8e2ff'
  secondary-fixed-dim: '#adc6ff'
  on-secondary-fixed: '#001a42'
  on-secondary-fixed-variant: '#004395'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.025em
  display-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0em
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: -0.005em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-sm: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system establishes an institutional-grade, modern enterprise B2B aesthetic engineered for high-frequency financial and administrative workflows. The aesthetic is anchored in structured minimalism and modern corporate governance: balanced density, precise data alignment, and uncompromising visual clarity.

The visual tone communicates reliability, fiscal stewardship, and calm efficiency. Interactions avoid excessive ornamentation, favoring crisp micro-interactions, explicit transactional feedback, and predictable navigation hierarchies. The experience balances administrative density (dense tables, audit trails) with clean executive overviews (spacious metric cards, high-legibility typographic hierarchies).

## Colors

The palette leverages high-contrast chromatic roles designed for financial state management, data integrity, and compliance auditing:

- **Primary Canvas & Structural Surfaces**: `#F8FAFC` (Slate-50) serves as the primary application background, offset by `#FFFFFF` for elevated data containers and cards. Subtle `#F1F5F9` (Slate-100) tones structure secondary panels and table headers.
- **Brand Navy & Interactive Slate**: `#1E293B` (Slate-800) acts as the commanding anchor for top-tier navigation, primary buttons, and strong visual weight. Accompanying dynamic interactions use `#3B82F6` (Blue-500) for focus rings, active links, and interactive controls.
- **Status & Fiscal State Engine**:
  - **Approval & Credit Balance**: `#10B981` (Emerald-500) with `#ECFDF5` container fills for successful reimbursements, active policies, and approved claims.
  - **Pending Review & Warning**: `#F59E0B` (Amber-500) paired with `#FFFBEB` fills for pending manager sign-offs, near-threshold budget limits, and incomplete submissions.
  - **Rejection & Over-Limit Alert**: `#EF4444` (Rose-500) with `#FEF2F2` fills for policy violations, denied expenses, and exhausted benefit caps.
- **Text & Borders**: Primary text anchors to `#0F172A` (Slate-900) for high-contrast legibility, secondary body to `#475569` (Slate-600), and borders strictly utilize `#E2E8F0` (Slate-200) for clean structural delimitation.

## Typography

The typography leverages a dual-type architecture:
- **Headlines & Executive Metric Cards**: Set in **Plus Jakarta Sans** for modern, refined authority and clean numeric metrics.
- **Body & Data Grid Cells**: Set in **Inter** to ensure maximum legibility at high data densities, tabular numerical scanning, and international multi-currency alignment.

Tabular figures (`font-variant-numeric: tabular-nums`) must be enabled on all numerical data cells, ledger entries, currency values, and date columns to prevent column jitter and align decimal points effortlessly across reporting tables.

## Layout & Spacing

The layout model uses a responsive 12-column fluid grid framework with fixed outer boundaries for wide enterprise displays:

- **Desktop (1280px+)**: 12 columns, 24px (`1.5rem`) gutters, 32px (`2rem`) outer margin, with a maximum content canvas container capped at 1440px.
- **Tablet (768px - 1279px)**: 8 columns, 16px (`1rem`) gutters, 24px (`1.5rem`) outer margin. Side-by-side metric cards collapse to 2-column or 4-column pairs.
- **Mobile (< 768px)**: 4 columns, 16px (`1rem`) gutters, 16px (`1rem`) outer canvas margin. Complex transaction tables convert into stacked audit cards.

All internal component layouts align to a strict 4px base increment. Data tables utilize compact 8px vertical padding for high-density settings and 12px for standard rows.

## Elevation & Depth

Visual hierarchy is constructed via layered surface containers paired with ultra-subtle, ambient tint shadows. Heavy drops and aggressive skeuomorphism are strictly prohibited.

- **Level 0 (Flat Base)**: Primary workspace canvas (`#F8FAFC`). No shadow, zero elevation.
- **Level 1 (Cards, Metric Containers, Table Wrappers)**: Background `#FFFFFF`, border `1px solid #E2E8F0`, shadow `0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.03)`.
- **Level 2 (Hover States, Flyouts, Popovers)**: Background `#FFFFFF`, border `1px solid #CBD5E1`, shadow `0 4px 6px -1px rgba(15, 23, 42, 0.06), 0 2px 4px -2px rgba(15, 23, 42, 0.04)`.
- **Level 3 (Modals, Slide-over Expense Drawers)**: Background `#FFFFFF`, border `1px solid #CBD5E1`, shadow `0 20px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)`. Backdrops use `#0F172A` at 40% opacity with a 4px blur (`backdrop-filter: blur(4px)`).

## Shapes

The design system implements a refined geometric silhouette:
- Standard interactive elements, inputs, and standard buttons use `0.5rem` (8px).
- Metric cards, summary containers, and data panels use `rounded-lg` (`1rem` / 16px) for an approachable, polished frame.
- High-level modal windows and expansive analytical cards use `rounded-xl` (`1.5rem` / 24px).
- Badges, transaction status indicators, and category tags are styled as true pills (`rounded-full` / `9999px`) to maintain sharp visual separation from rectangular data cells.

## Components

### Buttons
- **Primary**: Solid `#1E293B`, label `#FFFFFF`, border `1px solid transparent`, corner radius 8px (`rounded`). Hover: `#334155`. Active: `#0F172A`. Focus: 2px offset with `#3B82F6` ring.
- **Secondary**: Surface `#FFFFFF`, text `#1E293B`, border `1px solid #E2E8F0`. Hover: `#F8FAFC`, border `#CBD5E1`.
- **Destructive**: Surface `#FEF2F2`, text `#EF4444`, border `1px solid #FCA5A5`. Hover: surface `#EF4444`, text `#FFFFFF`.

### Status Badges & Pills
- **Approved / Active**: Pill-shaped (`rounded-full`), padding `2px 10px`, background `#ECFDF5`, text `#065F46`, font `label-sm`. Accompanied by a 6px solid emerald dot.
- **Pending Review**: Pill-shaped, background `#FFFBEB`, text `#92400E`, font `label-sm`. Accompanied by a 6px solid amber dot.
- **Rejected / Flagged**: Pill-shaped, background `#FEF2F2`, text `#991B1B`, font `label-sm`. Accompanied by a 6px solid rose dot.

### Metric Cards
- Background `#FFFFFF`, border `1px solid #E2E8F0`, corner radius `16px` (`rounded-lg`), padding `24px`.
- Layout: Top row hosts the category label (`label-md`, `#64748B`) and contextual trend badge. Center hosts the large numeric metric (`headline-lg`, Plus Jakarta Sans, `#0F172A`). Bottom row includes auxiliary delta comparisons (`body-sm`, `#64748B`).

### Data Tables
- Frame: Wrapped in a `rounded-lg` card with `1px solid #E2E8F0` border.
- Header: Background `#F8FAFC`, text `#475569`, font `label-sm` uppercase, height `40px`, bottom border `1px solid #E2E8F0`.
- Rows: Height `52px`, background `#FFFFFF`, bottom border `1px solid #F1F5F9`. Hover: background `#F8FAFC`. All numeric and currency cells align right; text strings align left.

### Form Inputs
- Height `40px`, corner radius `8px`, background `#FFFFFF`, border `1px solid #CBD5E1`, typography `body-md` in `#0F172A`.
- Placeholder text in `#94A3B8`. Active focus triggers a 1px border transition to `#3B82F6` with a `0 0 0 3px rgba(59, 130, 246, 0.15)` focus ring.

### Checkboxes & Radios
- Size `16px` by `16px`, corner radius `4px` (checkbox) or `rounded-full` (radio).
- Default border `1px solid #CBD5E1`. Checked state: background `#1E293B`, border `#1E293B`, icon `#FFFFFF`.