# Rental Management System - Design Guidelines

## Design Approach
**Design System:** Material Design 3 principles adapted for SaaS dashboards, emphasizing clarity, efficiency, and data density. This system excels at information-heavy applications with complex workflows.

**Core Principle:** Functional elegance - every element serves the user's workflow. Prioritize scanability, rapid task completion, and role-appropriate information hierarchy.

---

## Typography System

**Font Family:** Inter (Google Fonts) for UI, Roboto Mono for numerical data
- **Display (Dashboard Headers):** 2xl, font-bold (32px)
- **Page Titles:** xl, font-semibold (24px)
- **Section Headers:** lg, font-medium (18px)
- **Body/Form Labels:** base, font-normal (16px)
- **Table Data:** sm, font-normal (14px)
- **Metadata/Captions:** xs, font-normal (12px)
- **Numerical Data (rent, payments):** Roboto Mono, font-medium

---

## Layout System

**Spacing Units:** Tailwind units 2, 4, 6, 8, 12, 16 for consistent rhythm
- Component padding: p-6
- Section spacing: gap-8
- Card spacing: p-4
- Form fields: gap-4
- Dashboard grids: gap-6

**Container Strategy:**
- Sidebar: Fixed 256px width (w-64)
- Main content: Fluid with max-w-7xl, px-6 py-8
- Cards: Full width within grid constraints
- Forms: max-w-2xl for focused data entry

**Grid Patterns:**
- Dashboard overview: 3-column grid (grid-cols-3) for metric cards
- Property/Unit listings: 2-column grid (grid-cols-2)
- Tables: Full-width with horizontal scroll on mobile
- Mobile: Always single column (grid-cols-1)

---

## Navigation Structure

**Primary Navigation (Sidebar):**
- Fixed left sidebar with role-specific menu items
- Logo at top, user profile at bottom
- Active state: Subtle background shift with left border accent
- Icons from Lucide React paired with labels
- Collapsible on mobile (hamburger menu)

**Role-Specific Menus:**
- **Admin:** Dashboard, Properties, Managers, System Reports, Settings
- **Manager:** Dashboard, Properties, Units, Tenants, Leases, Payments, Maintenance, Reports, Messages
- **Tenant:** Dashboard, My Lease, Payments, Maintenance Requests, Messages

**Secondary Navigation:**
- Breadcrumbs for deep pages (Properties > Sunset Apartments > Unit 204)
- Tab navigation for entity details (Overview, Payments, Maintenance)

---

## Component Library

### Dashboard Cards
- Metric cards: h-32, rounded-lg, shadow-sm, p-6
- Large number (3xl, font-bold) + label (sm)
- Icon positioned top-right corner
- Trend indicators (up/down arrows) for financial metrics

### Data Tables
- Zebra striping (alternate row backgrounds)
- Sticky header row
- Action column (right-aligned): Edit, View, Delete icons
- Status badges: pill-shaped, rounded-full, px-3 py-1, text-xs
- Sortable columns with arrow indicators
- Pagination controls at bottom

### Forms
- Floating labels or top-aligned labels (consistent choice)
- Input height: h-11, rounded-md
- Full-width inputs with proper spacing (gap-4)
- Clear error states below fields (text-sm, red tone)
- Primary action button (right-aligned) + Cancel (ghost button)
- Multi-step forms: Progress stepper at top

### Property/Unit Cards
- Horizontal layout: Image (w-48, h-32, object-cover) + Details
- Status badge (Vacant/Occupied) top-right
- Key info: Unit number, rent amount, tenant name
- Action buttons: View Details, Edit (icon buttons)

### Payment Components
- Payment history: Table with date, amount, status, method columns
- Balance display: Large, prominent (text-3xl) with "Due Date" below
- Payment form: Amount (pre-filled), payment method selector, submit CTA

### Maintenance Request Cards
- Vertical card layout: Status badge, title, description preview, date
- Priority indicator (color-coded left border: high/medium/low)
- Expandable details panel
- Photo thumbnails if attachments exist

### Charts (Financial Reports)
- Bar charts: Monthly income/expense comparison (Recharts)
- Line charts: Trend analysis over time
- Height: h-80 for primary charts, h-64 for secondary
- Axis labels clearly visible, gridlines subtle

### Messaging Interface
- Split view: Conversation list (w-80) + Message thread (flex-1)
- Message bubbles: Sent (right-aligned), Received (left-aligned), rounded-2xl
- Timestamp below each message (text-xs)
- Composer at bottom: Textarea + Send button

---

## Modal & Overlay Patterns

**Modals:**
- Center-screen overlay with backdrop blur
- Max width: max-w-2xl for forms, max-w-4xl for detail views
- Header with close button (X icon top-right)
- Footer with action buttons (right-aligned)

**Dropdowns:**
- Shadcn UI dropdown patterns
- Open downward, align to trigger element
- Max height with scroll for long lists

---

## Responsive Behavior

**Breakpoints:**
- Mobile (base): Single column, collapsed sidebar (drawer)
- Tablet (md): 2-column grids, visible sidebar
- Desktop (lg+): 3-column grids, full layout

**Mobile Adaptations:**
- Tables: Horizontal scroll with fixed first column
- Navigation: Bottom tab bar for primary actions
- Forms: Full-width inputs, larger touch targets (h-12)
- Dashboard: Stack metric cards vertically

---

## Interaction Patterns

**Loading States:**
- Skeleton loaders for tables and cards
- Spinner for form submissions (button-integrated)
- Progress bars for multi-step processes

**Empty States:**
- Centered icon + message + CTA button
- "No properties yet. Add your first property" pattern

**Confirmations:**
- Alert dialogs for destructive actions (Delete, Archive)
- Toast notifications for success/error messages (top-right)

---

## Images

**Property/Unit Images:**
- Property cards: 192x128px thumbnails, rounded corners
- Unit detail headers: Full-width hero (16:9 aspect ratio, h-64)
- Default placeholder: Building icon on subtle background

**Profile Images:**
- Tenant/Manager avatars: Circular, w-10 h-10 in lists, w-24 h-24 in profiles
- Fallback: Initials on gradient background

**Maintenance Photos:**
- Thumbnail grid: 4-column (grid-cols-4), square aspect ratio
- Lightbox on click for full view

---

## Accessibility Notes
- ARIA labels on all icon-only buttons
- Form inputs with proper label associations
- Keyboard navigation support (Tab order, Enter to submit)
- Focus indicators visible on all interactive elements
- Status communicated via text, not color alone