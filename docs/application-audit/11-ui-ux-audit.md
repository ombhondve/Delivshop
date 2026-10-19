# 11 — UI/UX Design System & Layout Audit

## 1. Design System & Visual Tokens

The Delivshop platform implements a clean, high-contrast, modern design system tailored to fast-paced logistics and high-volume dairy trade.

### 1.1 Color Palette
- **Primary Brand Green:**
  - `#047857` (Emerald 700) — Primary CTAs, active status, verified marks.
  - `#059669` (Emerald 600) — Hover state, success indicators.
  - `#ECFDF5` (Emerald 50) — Success backgrounds, verified chips.
- **Accent Amber (Pending / Queue States):**
  - `#B45309` (Amber 700) — Warning, queue waiting duration, scheduling required.
  - `#FEF3C7` (Amber 100) — Unscheduled queue backgrounds, attention alerts.
- **Accent Blue (Info / In Transit):**
  - `#0284C7` (Sky 600) — In transit runs, route assignment, scheduling active.
  - `#E0F2FE` (Sky 100) — Information chips, transit run cards.
- **Neutral Dark & Slate:**
  - `#0F172A` (Slate 900) — Primary headings, typography, order numbers.
  - `#334155` (Slate 700) — Body text, table data.
  - `#64748B` (Slate 500) — Subtitles, metadata, timestamps.
  - `#F8FAFC` (Slate 50) — Surface backgrounds, card headers.
  - `#E2E8F0` (Slate 200) — Clean structural borders.

### 1.2 Typography
- **Primary Font Stack:** System font stack (`Inter`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`, `sans-serif`).
- **Hierarchy:**
  - Page Titles: 22px / 24px, Bold 800.
  - Card Titles / Section Headings: 16px / 18px, Bold 700.
  - Body & Table Text: 13px / 14px, Regular 400 & Medium 500.
  - Monospace Data (Order Numbers, Driver Codes, Vehicle Reg): 12px / 13px, Bold 700 (`monospace`, `font-family: Menlo, Consolas`).
  - Metadata / Badges: 11px / 12px, Bold 600.

---

## 2. Textual Screen Layout Specifications

### 2.1 Admin Orders List (`OrdersList.tsx`)
```
+---------------------------------------------------------------------------------------------------+
| HEADER: Title "Store Orders & Morning Replenishment" | Action: "Shop Orders & Dispatch" / "Export"|
+---------------------------------------------------------------------------------------------------+
| KPI METRICS BAR: 4 Cards (Delivered Today | Active In-Transit | Unscheduled Queue | Fleet Ready)  |
+---------------------------------------------------------------------------------------------------+
| TABS BAR: [All Orders (142)] | [Unscheduled Orders Queue (8)]                                     |
+---------------------------------------------------------------------------------------------------+
| FILTER ROW: Search Input [Order #, Shop, Phone] | Status Filter Dropdown | Refresh Button         |
+---------------------------------------------------------------------------------------------------+
| MAIN TABLE:                                                                                       |
| Order #    | Shop & Location  | Crates & Volume | Status Badge | Confirmed Date | Actions          |
| DS-26-8891 | Krishna Dairy    | 20 Crates (216L)| DELIVERED    | 14 Oct 2026    | [Review] [Audit] |
| DS-26-8892 | Anand Supermarket| 32 Crates (384L)| IN_TRANSIT   | 14 Oct 2026    | [Track]  [Audit] |
| DS-26-8895 | Om Sai Dairy     | 9 Crates (108L) | SCHEDULING   | -- Pending --  | [Schedule Order] |
+---------------------------------------------------------------------------------------------------+
| MODALS: ScheduleOrderModal (3 Tabs) | RescheduleModal | AuditHistoryModal                         |
+---------------------------------------------------------------------------------------------------+
```

### 2.2 Shop Mobile Create Order (`app/(shop)/create-order.tsx`)
```
+---------------------------------------------------------------------------------------------------+
| STATUS BAR & SAFE AREA                                                                            |
| Top Header: "Place Morning Replenishment" | Store Chip: "Krishna Dairy (SH-PUN-019)"             |
+---------------------------------------------------------------------------------------------------+
| NOTICE BANNER: (Cold-chain schedule notice - No date selector allowed)                            |
| "Deliveries are dispatched on scheduled cold-chain morning runs. Confirmation will follow."     |
+---------------------------------------------------------------------------------------------------+
| CATEGORY TABS: [All] [Pouch Milk] [Curd & Dahi] [Malai Paneer] [Ghee]                             |
+---------------------------------------------------------------------------------------------------+
| PRODUCT CARDS (SCROLLABLE LIST):                                                                  |
| [Image] Pure Whole Cow Milk (1L Pouch)                                                            |
|         Standard Crate: 12 Pouches (12 Litres)                                                    |
|         Price: ₹65.00 / pouch                                                                     |
|         Stepper: [ - ]  [ 24 ]  [ + ]   => (2 Milk Crates = ₹1,560.00)                            |
+---------------------------------------------------------------------------------------------------+
| FOOTER TOTAL BAR:                                                                                 |
| 24 Pouches • 2 Milk Crates • ₹1,560.00 Total                                                     |
| [ CONFIRM ORDER → ]                                                                               |
+---------------------------------------------------------------------------------------------------+
```

### 2.3 Driver Active Stop Execution (`app/(driver)/delivery/[id].tsx`)
```
+---------------------------------------------------------------------------------------------------+
| HEADER: Stop #3 of 12 | "Krishna Dairy & Provisions"                                              |
+---------------------------------------------------------------------------------------------------+
| STORE DETAILS CARD:                                                                               |
| Address: Shop 4, Paud Road, Kothrud, Pune                                                         |
| Contact: Ramesh Powar (+91 98220 12345) [ CALL BUTTON ]                                           |
| GPS Geofence: "Within 35m of Store Location" (Green Geotag) [ OPEN IN GOOGLE MAPS ]              |
+---------------------------------------------------------------------------------------------------+
| DROP SUMMARY:                                                                                     |
| Required Crates: 10 Milk Crates (120 Pouches)                                                     |
| Delivered Crates Input: [ 10 ] | Leaked/Damaged: [ 0 ]                                             |
+---------------------------------------------------------------------------------------------------+
| PROOF OF DELIVERY:                                                                                |
| Enter Merchant 4-Digit PIN: [ * ] [ * ] [ * ] [ * ]                                               |
| OR Tap to Capture Merchant Digital Signature                                                      |
+---------------------------------------------------------------------------------------------------+
| [ COMPLETE DROP & PROCEED TO NEXT STOP → ]                                                        |
+---------------------------------------------------------------------------------------------------+
```

---

## 3. Usability & Ergonomics Evaluation

1. **Date Picker Removal Usability:** Removing the delivery date picker from the Shop mobile app significantly reduces merchant confusion. Previously, merchants selected a requested date expecting delivery at that exact hour, which clashed with driver route schedules. The current `Pending` -> `Scheduling` -> `Confirmed Date` flow sets clear, professional expectations.
2. **Driver Touch Targets:** All mobile action buttons maintain a minimum tap target size of 48px × 48px, compliant with WCAG 2.1 accessibility guidelines, critical for drivers operating in warehouse loading bays with work gloves.
3. **Empty States & Loading Feedback:** All web tables and mobile lists render specialized empty state illustrations (`lucide-react` icons with helpful guidance messages) rather than blank screens.
4. **Form Validation Ergonomics:** Form errors appear inline below the relevant input field in `#DC2626` red with clear error icons, rather than obscure popup alerts.
