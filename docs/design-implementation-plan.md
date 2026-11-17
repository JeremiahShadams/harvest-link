# Farmer Screens — Strict Superdesign Implementation Plan

**Project:** `98e38cf4-d346-454e-90cb-928d5aaa06bc`

**Source of truth:** the five raw Superdesign drafts and their shared `Header` / `BottomNavigation` component definitions. This supersedes the earlier phased plan that kept the buyer-side cream/pine/gold skin.

The five drafts are the only visual authority. The implementation must preserve their layout, copy, colors, typography, spacing, radii, shadows, borders, backgrounds, icons, images and interactions. No redesign, simplification, rearrangement or copy edits.

## References

| Screen | Draft | Mobile route |
| --- | --- | --- |
| Farmer Dashboard | `8abbbcbe-d3e5-4624-ac24-b0d22816fc66` | `app/(tabs)/farmer.tsx` |
| Create Listing | `880f8190-1131-44db-9ac3-1cb1f090566c` | `app/listing/new.tsx` |
| Order Details | `27697f85-36ab-48d7-b035-6421b58ac975` | `app/order/[id].tsx` |
| Marketplace Signals | `a795bf8b-b0ba-4dc6-b433-ae63a1b65534` | `app/(tabs)/signals.tsx` |
| Farmer Profile Settings | `40f3b824-299c-4d3f-be43-e8003453ab2e` | `app/(tabs)/profile.tsx` (farmer/both) |

Shared components:
- Header `14fd8e9b-cd2a-4ba5-a515-0eb6eee3b822`
- BottomNavigation `e4dab3dd-4e71-43cc-b47b-10f07b8c6eb1`

The exact five-item farmer tab bar is **Home · Orders · Chats · Signals · Profile**. No designed Chats screen exists, so the tab reuses the existing updates/notifications surface rather than inventing a new design.

## Foundations

- Bundle Cabinet Grotesk (400/500/700/800) and Satoshi (400/500/700) from Fontshare and load them with `expo-font` in the root layout.
- Add a design token/primitives module for the exact slate/farm/amber/blue/red palette, Tailwind-equivalent spacing, radii, text styles, shadows, cards, inputs, selects, toggles, header and bottom navigation.
- Use `lucide-react-native` for every `iconify-icon lucide:*` icon and `expo-image` for the exact remote photos from the drafts.
- Preserve the draft chrome: white/80 header with 56px top inset, green online dot, greeting, map pin location, notification bell; fixed white bottom nav with amber Orders badge.
- Role-aware tabs: farmer/both use the exact five-item fixed nav rendered by the screens; buyer keeps the existing HarvestLink tab bar. Stack routes render the same fixed nav.

## Implementation order

1. Replace stale plan; download fonts.
2. Add design tokens/primitives, Header and BottomNavigation.
3. Farmer Dashboard: metrics, signals summary, recent orders, two exact CTA buttons.
4. Create Listing: form state, category chips, photo picker/removal, quantity/unit, price, date, description, scan CTA, pickup location link, Save Draft and Publish with validation/loading/success/error.
5. Order Details: order lookup, buyer card, four-step timeline, item rows, shelf-life badges, totals, delivery details, fixed action bar, status action and back navigation.
6. Marketplace Signals: score, trust badges, activity selector, fixed-height bar chart, activity rows, report CTA.
7. Farmer Profile Settings: cover/avatar, editable account and farm fields, crops, notification toggles, timing/language/help rows, log out and delete account.
8. Wire routes, revalidate SWR data, run checks, compare against every draft, commit.

## Data integration rules

- Reuse existing Supabase client, auth context, `useOrders`, `useFarmerListings`, `useScans`, `useNotifications`, `computeFarmerSignals`, `useActivityReport`, `advance_order_status`, `rate_delivered_order`, `create_activity_report` and profile update paths.
- Design literals remain visible exactly where the drafts show them. Where a live field does not exist, the literal is an explicit visual fallback, never a claim about production data.
- No new backend endpoints or invented schema columns.

### Known backend gaps (reported, not redesigned)

- No `delivery_fee`, status-event timestamps, buyer name/area/phone, delivery street address or decline status on orders.
- No draft listing status or listing photo storage path/columns.
- No notification preferences, farm size/GPS, primary crops, avatar URL or account-deletion RPC on profiles.
- No designed Chats screen and no response-time/cohort data for trust badges or the `Top 10%` badge.

These values are preserved as design fallbacks/local state only and are called out in the final report.

## Verification

- `npx tsc --noEmit` from `apps/harvestlink-mobile`.
- `npx eslint .` directly from `apps/harvestlink-mobile` (`npx expo lint` is broken with this ESLint version).
- Root `npx tsc --noEmit`.
- Start Expo and resolve route/runtime errors.
- Compare each screen against its raw HTML reference before committing.
