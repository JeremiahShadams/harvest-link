# Farmer App — Design Implementation Plan

**Source of truth:** the five Superdesign drafts (Farmer Dashboard, Create Listing, Order Details,
Marketplace Signals, Profile Settings), plus `HarvestLink_Full_Product_Specification.md` v2.0.

**Status:** Phase 0 in progress.

---

## 0. Start here

**Prerequisites:** Node 20+, pnpm, a Supabase project, Expo Go or a development build.

```bash
cd "web to Mobile"
pnpm install
cp .env.example .env.development.local    # fill in the Supabase values
pnpm dev                                  # Next.js on :3000 (scan API + report pages)

cd apps/harvestlink-mobile
npx expo start                            # Expo dev server
```

**Order of work from here**

1. **Export the live schema** — `supabase db dump --schema public > supabase/schema.sql`.
   Everything in §4 depends on knowing the real column and constraint names. This is the only
   blocker.
2. **Phase 1 — Order Details.** Highest demo value and it forces the data fixes the other screens
   need (timestamps, delivery fee, decline reason).
3. **Phase 2 — Farmer Home** rewritten on the new signal module.
4. **Phase 3 — Create Listing** with real photo upload.
5. **Phase 4 — Signals** moves to the server snapshot.
6. **Phase 5 — Profile Settings.**
7. **Phase 6 — QA pass.**

---

## 1. Decision: what "build the design" means here

We adopt the drafts' **information architecture, screen split, layout and content hierarchy**.
We keep HarvestLink's own visual language.

| | Draft | HarvestLink |
|---|---|---|
| Background | `#f8fafc` slate | `#F5F2E9` cream |
| Primary | `#1e4620` emerald | `#214A38` pine |
| Accent | `#f59e0b` amber | `#D49B3D` gold |
| Type | Cabinet Grotesk / Satoshi | system font (option: bundle Cabinet Grotesk + Satoshi) |
| Cards | white, `rounded-3xl` | white, 20–24px radii |

Why: the buyer side already ships in cream/pine/gold. Copying the slate skin would either force a
full repaint of the buyer app or leave two design systems in one binary. The drafts' value is the
**structure** and the **data they expose** (photos, units, delivery fee, timestamps, response time).

> If we later want the exact draft skin, it is a token swap in
> `components/harvestlink/ui.tsx` plus one font load — no screen rewrite.

---

## 2. Screen map (farmer side)

| Screen | Route | Replaces |
|---|---|---|
| Farmer Home | `app/(tabs)/farmer.tsx` | `farmer-screen.tsx` (rewritten) |
| Orders list | `app/(tabs)/orders.tsx` | kept, cards link to detail |
| Order Details | `app/order/[id].tsx` | new |
| Create Listing | `app/listing/new.tsx` | `listing-form.tsx` sheet |
| Signals | `app/(tabs)/signals.tsx` | new (absorbs score/report from home) |
| Profile Settings | `app/(tabs)/profile.tsx` | `profile-screen.tsx` (rewritten) |
| Freshness scan | `app/(tabs)/scan.tsx` | kept; hidden from farmer tab bar, reachable via CTA |

### Tabs by role

| Role | Tabs |
|---|---|
| buyer | Market · Orders · Scan · Profile |
| farmer | Home · Orders · Signals · Profile |
| both | Market · Home · Orders · Signals · Profile |

Scan stays a real route for everyone (`href: null` hides it from the tab bar for farmers) so the
"Scan & List" CTA on Home and the scan button in Create Listing keep working.

Chats: **not a tab yet.** No chat screen is designed. Order Details gets WhatsApp / `tel:` actions.
Add the tab when a chat screen exists.

---

## 3. Build order

Order Details first: it exercises the whole core loop and forces the data-model fixes every later
screen depends on.

### Phase 0 — Foundations
- [x] Role-aware tab bar + Signals route
- [x] Move Profile from modal route to tab route
- [x] Shared design tokens: `radii`, `space`, `typeScale`
- [x] Shared primitives: `StatTile`, `ProgressBar`, `SegmentedControl`, `Avatar`, `ScreenScroll`
- [x] One signal-computation module: `lib/harvestlink/signals.ts`
- [ ] Bundle Satoshi + Cabinet Grotesk (optional, 0.5 day)

### Phase 1 — Order Details (`app/order/[id].tsx`)
- Buyer card: name, area, avatar, contact buttons (WhatsApp / call).
- Vertical status timeline with timestamps.
- Item rows: crop, unit, quantity, unit price, shelf-life range badge.
- Money block: subtotal, delivery fee, total earnings.
- Delivery block: address, landmark, window.
- Fixed bottom bar: Decline (with reason) / Accept, then next-status action.
- Data: `order_status_events`, `orders.delivery_fee_ngn`, `orders.decline_reason`,
  `orders.delivery_address`, `orders.delivery_landmark`, `orders.status += declined | cancelled`.
  RPC `get_farmer_order(p_order_id)` returns buyer name/area without widening table RLS.

### Phase 2 — Farmer Home
- Hero: active listings + "Create listing".
- Pending orders tile, monthly completed tile.
- Signals card driven by `computeFarmerSignals`.
- Recent orders: thumbnail, order ref, relative time, status pill, rating.
- Remove hardcoded/marketing copy; every number from data.

### Phase 3 — Create Listing (`app/listing/new.tsx`)
- 3 steps + progress bar; Save Draft (`status: 'draft'`).
- 4-photo grid → compress → Supabase Storage `listing-photos` → `listing_photos` table.
- Unit selector (`kg | basket_big | basket_small | sack | crate`) + `price_per_unit`.
- Description, harvest date, AI shelf-life panel from the scan result.

### Phase 4 — Signals
- 30 / 90 day segmented control, score, delivery rate, sales, consistency, weekly bars.
- Single server RPC `farmer_signal_snapshot(p_user, p_days)`; retire the three client-side
  score formulas.
- Report generation moved here, with "How this is calculated" and revocation.
- No "Top 10%" badge until the cohort is real (≥ 20 farmers).

### Phase 5 — Profile Settings
- Cover + avatar upload, verified badge, account info, farm details (name, size, GPS, primary
  crops), notification preferences (`profiles.notification_prefs`), language, help, version,
  sign out, delete account.

### Phase 6 — QA
- Empty / loading / error state for every new screen.
- Accessibility labels and states.
- 360px Android layout check.
- `npx tsc --noEmit`, `npx expo lint`.
- Maestro flows: accept order, publish listing, generate report.

**Estimate:** ~11 dev days + ~3 backend days.

---

## 4. Data model additions

```sql
-- Phase 1
alter table orders add column if not exists delivery_fee_ngn numeric not null default 0;
alter table orders add column if not exists delivery_address text;
alter table orders add column if not exists delivery_landmark text;
alter table orders add column if not exists decline_reason text;

create table if not exists order_status_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  status text not null,
  actor_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- Phase 3
alter table listings add column if not exists unit text not null default 'kg';
alter table listings add column if not exists price_per_unit numeric;
alter table listings add column if not exists description text;
alter table listings add column if not exists status_draft boolean; -- or extend the status enum

create table if not exists listing_photos (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  storage_path text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

-- Phase 4/5
alter table profiles add column if not exists notification_prefs jsonb not null default '{}'::jsonb;
```

**Blocker:** the repo has no migrations and the live schema is unknown. Before Phase 1 lands, export
the current schema (`supabase db dump --schema public`) so migrations extend it instead of guessing.

---

## 5. File map

```
apps/harvestlink-mobile/
  app/
    (tabs)/_layout.tsx          role-aware tabs
    (tabs)/farmer.tsx           Home
    (tabs)/signals.tsx          NEW
    (tabs)/profile.tsx          NEW (moved from app/profile.tsx)
    order/[id].tsx              NEW (Phase 1)
    listing/new.tsx             NEW (Phase 3)
  components/harvestlink/
    ui.tsx                      tokens + primitives
    farmer-home.tsx             NEW (Phase 2)
    order-detail.tsx            NEW (Phase 1)
    signals-screen.tsx          NEW
    create-listing/             NEW (Phase 3)
    profile-screen.tsx          rewritten (Phase 5)
  lib/harvestlink/
    signals.ts                  NEW, single computation source
    use-report.ts               NEW, activity report hook
    use-data.ts                 extend with order detail / metrics hooks
    types.ts                    extend order/listing/profile types
```

---

## 6. Definition of done (per screen)

- Every number comes from data or shows an honest empty state — nothing hardcoded.
- Loading, empty and error states exist.
- Works at 360px width and on iOS/Android.
- `tsc --noEmit` clean.
- No new client-side formula that disagrees with the report.

---

## 7. Out of scope for this pass

- Multi-item orders (render single-item rows that can grow into a list).
- Real in-app chat.
- PDF export (keep the signed web link).
- Delivery-fee engine (flat fee per zone).
- Credit scoring / lender integrations.
