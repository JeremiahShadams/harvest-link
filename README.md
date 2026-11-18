# HarvestLink

> **Connecting local farmers with nearby buyers to sell produce closer to harvest and drastically cut post-harvest loss.**

HarvestLink is a unified produce marketplace monorepo consisting of a **Next.js 16 web application** and an **Expo SDK 58 React Native mobile application**, powered by a shared **Supabase** backend. It equips smallholder farmers with digital storefronts, order tracking, reputation signals, and computer-vision freshness estimations, while giving wholesale and retail buyers direct access to farm-fresh local produce.

---

## Architecture & Monorepo Layout

This repository is managed with `pnpm` workspaces:

```
harvest-link/
├── app/                          # Next.js App Router (web application & API endpoints)
│   ├── api/shelf-scan/route.ts   # Server-side AI produce freshness & shelf-life evaluation
│   ├── (auth)/                   # Authentication routes (login, signup, reset)
│   ├── browse/                   # Buyer marketplace & search
│   ├── farmer/                   # Web-based farmer portal
│   └── orders/                   # Web order status & history
├── apps/
│   └── harvestlink-mobile/       # Expo SDK 58 / React Native cross-platform mobile app
│       ├── app/                  # Expo Router file-based screens and tabs
│       │   ├── (tabs)/           # Role-aware tab navigation (farmer vs. buyer)
│       │   ├── listing/new.tsx   # Fast crop listing creation flow
│       │   └── order/[id].tsx    # 4-stage order details & fulfillment timeline
│       ├── assets/fonts/         # Bundled Fontshare typography (Cabinet Grotesk & Satoshi)
│       └── components/           # Mobile design tokens, header, navigation & farmer views
├── components/                   # Shared web UI primitives & layout components (Tailwind CSS 4)
├── docs/                         # Product specifications, PRD, and design source-of-truth
│   ├── HarvestLink_Full_Product_Specification.md
│   ├── HarvestLink_Product_Requirements_Document.md
│   └── design-implementation-plan.md
├── lib/                          # Data hooks, Supabase clients, types, and business logic
└── public/                       # Static web assets & placeholders
```

---

## Key Features

- **Farmer Dashboard**: Real-time sales metrics, revenue analytics, quick inventory status, and pending order actions.
- **Produce Listing & AI Shelf-Life Scanner**: Effortless produce listing with camera capture and automated freshness assessment estimating remaining days and optimal storage tips.
- **Fulfillment & Order Lifecycle**: 4-stage tracking (*Placed &rarr; Confirmed &rarr; In Transit &rarr; Delivered*) with live delivery coordination.
- **Marketplace Trust Signals**: Data-backed farmer reliability scoring, fulfillment consistency badges, and activity trend graphs.
- **Role-Aware Navigation**:
  - **Farmer / Dual Accounts**: Dedicated five-item mobile navigation (**Home · Orders · Chats · Signals · Profile**).
  - **Buyer Accounts**: Streamlined produce discovery and order cart navigation.
- **Universal Supabase Integration**: Shared authentication, row-level security, and real-time cache revalidation via SWR across both platforms.

---

## Tech Stack

| Domain | Technology |
| --- | --- |
| **Monorepo** | `pnpm` workspaces (v12.3.4) |
| **Web App** | Next.js 16 (App Router), React 19, Tailwind CSS 4, Radix/Base UI |
| **Mobile App** | React Native 0.88, Expo SDK 58, Expo Router, Reanimated |
| **Backend & Auth** | Supabase (PostgreSQL, Auth, Storage, Realtime channels) |
| **Data Fetching** | SWR with optimistic updates and live socket invalidations |
| **Typography** | Fontshare (Cabinet Grotesk & Satoshi) |
| **Icons & Media** | Lucide Icons (`lucide-react`, `lucide-react-native`), `expo-image` |

---

## Getting Started

### Prerequisites

- **Node.js**: `v20.x` LTS or newer (`node -v`)
- **pnpm**: `v12.3.4` (Enable via `corepack enable pnpm`)
- **Supabase Account**: A Supabase instance configured with the schema in `lib/harvestlink/types.ts`
- **Mobile Testing**: Expo Go app installed on your physical device, or Android Studio / Xcode for native simulator builds

### 1. Clone & Install

```bash
git clone https://github.com/JeremiahShadams/harvest-link.git
cd harvest-link
pnpm install
```

### 2. Configure Environment Variables

Create your local environment file by copying the template:

```bash
cp .env.example .env.development.local
```

Fill in your configuration details:

| Variable | Target | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Web & Mobile | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Web & Mobile | Supabase publishable / anon public key |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Web & Mobile | Fallback key name for older Supabase project versions |
| `EXPO_PUBLIC_API_BASE_URL` | Mobile | Base URL for `/api/shelf-scan` (Use `http://localhost:3000` for simulator, or `http://<YOUR-LAN-IP>:3000` for physical devices) |

> **Note:** `.env*.local` is explicitly git-ignored. Values are securely resolved at runtime and bundled into the Expo app manifest via `apps/harvestlink-mobile/app.config.ts`.

---

## Development

### Run the Web Application

```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Run the Mobile Application

```bash
# Using the root convenience script
pnpm mobile:start

# Or directly from the mobile app workspace
cd apps/harvestlink-mobile
npx expo start
```

#### Connecting via Physical Device / Expo Go:
- **Tunnel Mode (Recommended if facing Wi-Fi / LAN restrictions)**:
  ```bash
  npx expo start --tunnel
  ```
  Tunnel mode bypasses router firewalls and local subnet mismatch between PC and mobile device.
- **Native Development Client**:
  ```bash
  npx expo run:android
  # or
  npx expo run:ios
  ```

---

## Code Quality & Verification

Run these validation checks prior to committing changes:

```bash
# Typecheck web & shared packages
pnpm typecheck

# Typecheck mobile app
pnpm mobile:typecheck

# Mobile app linting
cd apps/harvestlink-mobile
npx eslint .
```

---

## Documentation

Comprehensive product specifications and implementation guides are located in the `docs/` directory:

- [HarvestLink Product Requirements Document (PRD)](docs/HarvestLink_Product_Requirements_Document.md): User personas, functional requirements, and milestone phases.
- [Full Product Specification](docs/HarvestLink_Full_Product_Specification.md): Architectural flows, entity models, and technical specifications.
- [Strict Superdesign Implementation Plan](docs/design-implementation-plan.md): Mobile UI specification, design token mapping, and schema gap analysis.

---

## License

This project is licensed under the MIT License - see the [LICENSE](apps/harvestlink-mobile/LICENSE) file for details.
