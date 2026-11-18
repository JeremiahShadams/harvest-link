# Product Requirements Document (PRD)
## HarvestLink – Hyperlocal Farm-to-Buyer Marketplace with AI Shelf-Life Intelligence

**Version:** 1.0  
**Date:** 12 November 2026  
**Status:** Draft for MVP  
**Owner:** Product / Engineering  
**Document Type:** Product Requirements Document  

---

## 1. Executive Summary

HarvestLink is a mobile-first platform that connects urban buyers in Lagos with nearby farmers and peri-urban producers for the purchase and delivery of fresh farm produce. The core differentiator is an integrated computer-vision feature that estimates remaining shelf life and provides storage recommendations when a user scans produce with their phone camera.

The product solves two tightly linked problems:
1. Urban consumers struggle to access truly fresh, traceable produce with predictable quality and delivery.
2. Farmers and small producers face high post-harvest losses and limited direct market access, while also lacking simple tools to demonstrate product quality and manage inventory.

By combining a hyperlocal marketplace with practical AI shelf-life intelligence, HarvestLink aims to increase farmer income, reduce food waste, and give buyers higher confidence in freshness.

**Primary Platform:** Mobile App (iOS + Android, with progressive web fallback where useful)  
**Primary Geography (MVP):** Lagos metropolitan area (initial corridors: Ikorodu / Epe / Sango ↔ Lekki / Ogba / selected mainland zones)

---

## 2. Problem Statement

### Buyer Pain
- Difficulty obtaining consistently fresh produce without travelling to distant markets.
- Uncertainty about how long purchased items will last and how best to store them.
- Time cost and quality risk of traditional market visits.

### Farmer / Producer Pain
- Limited direct access to urban buyers willing to pay for freshness.
- High post-harvest losses due to poor storage knowledge, delayed sales, and lack of demand visibility.
- Difficulty demonstrating quality or remaining useful life to potential buyers or financing partners.
- Thin margins and dependence on middlemen.

### Market Context
Post-harvest losses in Nigeria and broader Africa remain significant. Urban demand for fresher, more convenient produce is rising. Existing general marketplaces and delivery apps rarely combine real farm-direct sourcing with practical quality/shelf-life intelligence. Competitions, grants, and impact-oriented capital currently show strong interest in agritech solutions that improve market access and reduce food loss.

---

## 3. Goals & Success Metrics

### Business Goals
- Create a viable hyperlocal fresh-produce marketplace with measurable reduction in waste and improved farmer margins.
- Build a defensible data advantage through shelf-life scans and transaction history.
- Position the product for grants, competitions, and early-stage investment by demonstrating real usage, impact, and unit economics.

### Product Goals (MVP)
- Enable farmers to list produce and attach AI-generated shelf-life estimates.
- Enable buyers to discover nearby available produce, place orders, and receive delivery.
- Allow both parties (and delivery partners) to scan produce and receive remaining shelf-life + storage guidance.
- Capture basic inventory and order data that can later support financing conversations.

### Key Success Metrics (MVP – first 3 months post-launch)
| Metric | Target | Notes |
|--------|--------|-------|
| Active farmers listing | 30–50 | Focus on 1–2 corridors |
| Completed orders | 150+ | Real paid or confirmed deliveries |
| Scan usage rate | ≥ 40% of orders have at least one scan | Buyer or farmer initiated |
| Average delivery time (selected corridors) | < 4–6 hours where feasible | Measure and improve |
| Repeat buyer rate | ≥ 25% | Within 30 days |
| Farmer-reported waste reduction | Qualitative + any quantifiable data | Surveys + inventory notes |
| App crash-free sessions | ≥ 98% | Stability |

---

## 4. Target Users & Personas

### Primary Personas

**1. Urban Buyer (e.g., “Busy Lekki Professional”)**
- Lives/works in Lekki, Ogba, or similar.
- Values freshness, convenience, and time savings.
- Willing to pay a modest premium for reliable quality and delivery.
- Uses smartphone heavily; expects simple, fast ordering.

**2. Small / Peri-urban Farmer or Producer (e.g., “Ikorodu Grower”)**
- Produces vegetables, maize, fruits, or similar on small-to-medium scale.
- Currently sells through markets or middlemen with high loss risk.
- Has a smartphone and can take photos / perform simple scans.
- Wants better prices, faster sales, and tools that reduce waste.

**3. Secondary: Delivery Rider / Logistics Partner**
- Needs clear order details, pickup locations, and status updates.
- May perform or verify scans at handover points.

### User Needs Summary
- Buyers: Speed, freshness confidence, fair pricing, reliable delivery.
- Farmers: Easy listing, demand visibility, reduced losses, better net price.
- Both: Trust, simple mobile experience, minimal data usage.

---

## 5. Solution Overview

HarvestLink is a mobile application with two main roles (Buyer and Farmer/Producer) plus supporting operational views.

**Core Value Proposition**  
“Order fresh produce directly from nearby farms. Scan it with your phone to know how many days it has left and the best way to store it.”

**Key Differentiator**  
Integrated computer-vision shelf-life estimation + storage advice, tightly coupled to marketplace listings and order fulfilment. This is not a standalone scanner app nor a generic grocery marketplace.

---

## 6. Functional Requirements

### 6.1 Core Features – MVP

#### A. Authentication & Profiles
- Phone number + OTP login (primary).
- Optional basic profile (name, location/area, role: Buyer / Farmer).
- Simple KYC-lite for farmers (optional photo of farm or ID later).

#### B. Farmer Features
- Create and manage produce listings:
  - Crop type, quantity available, unit (kg, bunch, piece), price, harvest/pickup window, location/area.
  - Ability to attach or generate shelf-life estimate via camera scan at listing time.
- View incoming orders and mark status (accepted, ready for pickup, completed).
- Basic inventory summary (what is listed / sold).
- Simple earnings / order history view.

#### C. Buyer Features
- Browse or search available produce filtered by area, crop, estimated remaining shelf life, price.
- View listing details including AI shelf-life estimate and storage tips (when available).
- Place order (quantity, preferred delivery window, delivery address/area).
- Track order status.
- On receipt (or at any point): scan produce to get/update shelf-life estimate and storage advice.
- Basic order history and re-order capability.

#### D. Shelf-Life Scanner (Shared)
- Camera-based capture of produce.
- Return:
  - Estimated days remaining until spoilage (or quality drop).
  - Short storage recommendations (temperature, humidity, light, container tips).
- Works offline or with minimal connectivity where possible (on-device inference preferred for core cases).
- Support for priority crops in MVP (e.g., tomatoes, peppers, leafy greens, maize/corn, selected fruits).
- Clear indication of confidence / limitations (“Estimate based on visual appearance – actual life depends on storage conditions”).

#### E. Order & Delivery Coordination
- Order creation and status workflow (Pending → Accepted → Ready → Out for Delivery → Delivered).
- Basic communication (in-app chat or deep-link to WhatsApp/call).
- Delivery partner assignment (manual or simple matching in early version).
- Proof of delivery (photo or confirmation).

#### F. Notifications
- Push notifications for: new order, order status change, produce ready, short shelf-life alerts, delivery updates.

### 6.2 Non-Goals for MVP (Explicitly Out of Scope)
- Full multi-city expansion.
- Advanced financing / loan application module (data capture only).
- Complex cold-chain IoT integration.
- Heavy social features or content feed.
- Multi-language beyond English + simple local terms if needed.
- Sophisticated dynamic pricing engine.
- Full accounting or inventory ERP for large farms.

---

## 7. User Flows (High-Level)

### Farmer – List Produce with Scan
1. Open app → Farmer home.
2. Tap “Add Produce”.
3. Select crop type and enter quantity, price, availability window, location.
4. Optional / Recommended: Scan produce → receive estimate + tips → attach to listing.
5. Publish listing.
6. Receive notification when order arrives → Accept / Manage.

### Buyer – Discover, Order, Receive & Scan
1. Open app → Browse nearby / available produce (with shelf-life badges where available).
2. Select listing → View details (including AI estimate & storage tips).
3. Add quantity → Choose delivery preference → Confirm order.
4. Track status.
5. On delivery: Confirm receipt → Optionally scan items for personal shelf-life guidance and storage tips.
6. Leave simple feedback if desired.

### Shared – Standalone or Ad-hoc Scan
User can open scanner from home or order screen at any time to check produce they already have.

---

## 8. Technical Requirements

### Platform
- Primary: Native or cross-platform mobile (React Native / Flutter preferred for speed, or native if performance critical for camera/ML).
- Backend: Scalable API (Node.js / Python FastAPI or equivalent).
- Database: Relational + object storage for images.
- Auth: Phone OTP (e.g., Firebase, Termii, or local provider).

### AI / Computer Vision
- Model capable of produce classification + quality / spoilage stage estimation.
- Prefer on-device or edge inference for core crops to reduce latency and data cost.
- Fallback to server-side for rarer items or model updates.
- Continuous improvement loop: collect consented scan images + user feedback on actual outcomes where possible.
- Clear uncertainty handling and user-facing disclaimers.

### Performance & Reliability
- Fast load times on mid-range Android devices common in Nigeria.
- Graceful offline / low-connectivity behaviour (queue actions, cache recent listings).
- Efficient image handling (compression before upload).
- High stability (target 98%+ crash-free sessions).

### Security & Privacy
- Secure handling of user data and location.
- Image data used only for product improvement with consent.
- Basic fraud prevention on orders and listings.

### Integrations (MVP)
- Maps / location services.
- Push notification service.
- Payment (simple – cash on delivery first, then local payment gateways).
- Optional WhatsApp deep links for communication.

---

## 9. Design Principles

- Extremely simple and fast. Farmers and busy buyers will abandon friction.
- Visual clarity: shelf-life estimates must be immediately understandable (e.g., “~4 days left” + colour cue).
- Low data usage mindset.
- Trust signals: clear origin, harvest timing, scan results, delivery confirmation.
- Mobile-first, thumb-friendly, large tap targets.

---

## 10. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|----------|
| Logistics reliability & cost in Lagos | High | Start with very narrow corridors; partner with existing riders; measure real delivery times early |
| Scanner accuracy on diverse real-world produce | High | Limit MVP crops; collect real data; set user expectations with confidence scores and disclaimers |
| Farmer onboarding & listing quality | Medium | Hands-on onboarding in target areas; simple listing flow; incentives for complete listings with scans |
| Low initial liquidity (few listings or buyers) | High | Manual seeding of supply; focus on one high-demand crop or area first; direct outreach |
| Unit economics (delivery + thin margins) | High | Track contribution margin per order from day one; optimise batching and corridor density |
| Model drift / performance in field conditions | Medium | Monitoring, feedback loop, periodic retraining |

---

## 11. Go-to-Market & Validation Approach (MVP)

1. Select 1–2 tight geographic corridors.
2. Onboard a small set of reliable farmers (target 15–30) with hands-on support.
3. Seed initial demand through direct outreach, communities, and early adopter buyers.
4. Run real orders and measure the full loop (listing → order → delivery → scan).
5. Iterate rapidly on friction points in the mobile experience.
6. Collect qualitative feedback + the quantitative metrics defined earlier.
7. Use evidence (orders completed, scan usage, waste reduction stories, delivery performance) for grant/competition applications and early investor conversations.

---

## 12. Future Opportunities (Post-MVP)

- Expand crop coverage and improve model accuracy with more real data.
- Deeper financing tools using inventory + transaction history as signals.
- Cold-chain or storage partner integrations.
- Subscription or recurring order options for households and small businesses (restaurants, etc.).
- Buyer-side household inventory + “use by” reminders powered by past scans.
- Multi-corridor and multi-city expansion once unit economics are proven.
- B2B supply for small retailers or food businesses.

---

## 13. Open Questions

- Exact priority crop list for MVP scanner accuracy.
- Preferred payment flow for first version (COD vs instant).
- Delivery partner model (in-house coordination vs third-party).
- Data retention and model improvement consent language.
- Branding and final product name.

---

## 14. Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 12 Nov 2026 | Product | Initial PRD based on merged marketplace + shelf-life scanner concept and existing first versions |

---

**End of Document**

This PRD is intended as a living document. Update it as real user feedback and technical learnings arrive.