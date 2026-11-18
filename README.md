# HarvestLink

HarvestLink connects local farmers with nearby buyers so produce can be sold closer to harvest and post-harvest loss is reduced. This repository is a pnpm monorepo containing a Next.js web app and an Expo/React Native mobile app that share one Supabase backend.

## Repository layout

| Path | Purpose |
| --- | --- |
| `app/`, `components/`, `lib/` | Next.js 16 App Router web app (Tailwind CSS 4, shadcn-style UI, SWR data layer) |
| `app/api/shelf-scan/route.ts` | Server route used by the shelf-life scan feature |
| `apps/harvestlink-mobile/` | Expo SDK 58 / React Native app using Expo Router |
| `docs/design-implementation-plan.md` | Source-of-truth mapping for the five Superdesign farmer screens and known backend gaps |

The web app provides the buyer marketplace, farmer views, orders, notifications, profile management, and produce shelf-life scanning/reporting. The mobile app mirrors those flows and adds the strict Superdesign farmer screens: farm dashboard, create listing, order details, marketplace signals, and profile settings.

Farmer and “both” accounts use the fixed mobile tab bar **Home · Orders · Chats · Signals · Profile**. Buyer accounts keep the marketplace tab bar. There is no separate designed Chats screen, so that tab reuses the existing notifications/updates surface.

## Prerequisites

- Node.js 20 LTS or newer
- pnpm 12.3.4 (`corepack enable` will activate the version pinned in `package.json`)
- A Supabase project with the tables and RPCs referenced in `lib/harvestlink/types.ts` and the data hooks
- Expo Go on a physical device for LAN testing, or an Android/iOS development build for native-only changes

## Environment setup

Copy the example file and fill in your own values:

```bash
cp .env.example .env.development.local
```

| Variable | Used by | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Web + mobile | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Web + mobile | Publishable/anon key. Older projects may use `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `EXPO_PUBLIC_API_BASE_URL` | Mobile | Base URL for `/api/shelf-scan` and report links. Use `http://localhost:3000` on a simulator, or `http://<your-LAN-IP>:3000` on a phone |

`.env*.local` files are ignored by Git. The mobile config in `apps/harvestlink-mobile/app.config.ts` injects these values into the Expo app manifest at startup. Placeholder values are enough to render the UI, but real sign-in and live data require a real Supabase project.

## Install

```bash
pnpm install
```

## Run the web app

```bash
pnpm dev
```

Open http://localhost:3000.

## Run the mobile app

```bash
cd apps/harvestlink-mobile
npx expo start --lan --clear --port 8081
```

Scan the QR code with Expo Go. The phone must be on the same Wi-Fi network as the computer. If LAN traffic is blocked, either use `npx expo start --tunnel` (requires an Expo account login) or create a development build with `npx expo run:android` / `npx expo run:ios`.

The bundled Cabinet Grotesk and Satoshi fonts load from local assets through `expo-font`. Images come from `expo-image`, and icons from `lucide-react-native`.

## Checks

Run these before submitting changes:

```bash
cd apps/harvestlink-mobile
npx tsc --noEmit
npx eslint .
cd ../..
npx tsc --noEmit
```

`npx expo lint` currently fails with the installed ESLint version; invoke `npx eslint .` directly from `apps/harvestlink-mobile` instead.

## Architecture notes

- Supabase Auth is shared by both apps. On native, sessions are persisted with `expo-secure-store`; on web, session storage is used.
- Data fetching uses SWR, with Supabase realtime channels invalidating order and notification caches.
- Mobile design tokens live in `components/harvestlink/design/tokens.ts`; shared primitives live in `ui.tsx` in the same folder.
- Values that appear in the drafts but do not yet exist in the database schema are kept as explicit local fallbacks in `lib/harvestlink/design-local.ts`. They are visual placeholders, not production data.
- The five farmer screens strictly mirror their Superdesign references. Do not redesign, rearrange, rephrase, or restyle them without updating the source drafts first.

## Known backend gaps

The following design values have no schema/API backing yet and currently render as fallbacks or local state:

- delivery fee, status-event timestamps, buyer name/area/phone, delivery street address, and decline status on orders
- draft listing status and listing photo storage paths
- notification preferences, farm size/GPS, primary crops, avatar URL, and account-deletion RPC on profiles
- response time and cohort data for trust badges

See `docs/design-implementation-plan.md` for the full list and the draft-to-route mapping.

## License

The mobile app ships under the MIT license found at `apps/harvestlink-mobile/LICENSE`.
