# HarvestLink – Full Product Specification
### Hyperlocal Farm-to-Buyer Marketplace + AI Shelf-Life Intelligence + Farmer Credit Signals

**Version:** 2.0 (Integrated)  
**Date:** 14 November 2026  
**Status:** Production-ready specification for high-quality build  
**Platform:** Mobile-first (React Native)  
**Primary Market:** Lagos and surrounding areas, expandable  

---

## 1. Product Vision

HarvestLink is a single, high-quality mobile application that connects urban buyers with nearby farmers for fresh produce, uses phone-based computer vision to estimate remaining shelf life and give storage advice, and turns real marketplace activity into clean, shareable signals that help farmers access better financing and grant opportunities.

It is not three separate products. It is one coherent platform with three tightly integrated layers:

1. **Marketplace** – discovery, ordering, and delivery of fresh produce
2. **Intelligence** – AI shelf-life estimation and storage guidance
3. **Trust Layer** – activity and inventory signals that support financing conversations

---

## 2. Problem Statement

- Urban buyers struggle to get consistently fresh, traceable produce without spending significant time.
- Farmers face high post-harvest losses and limited direct access to willing urban buyers.
- Smallholder farmers and peri-urban producers often lack formal records, making it harder to access loans, input financing, or grants.
- Existing solutions rarely combine market access, practical quality tools, and financing signals in one usable product.

---

## 3. Core Value Proposition

**For Buyers:**  
Order truly fresh produce from nearby farms and know how long it will last and how to store it.

**For Farmers:**  
Sell faster, reduce waste, and build a verifiable activity record that can support financing and grant applications.

---

## 4. Target Users

### Primary
- Urban buyers in Lagos (Lekki, Ogba, mainland areas) who value freshness and convenience
- Small and medium-scale farmers / producers in Ikorodu, Epe, Sango, and surrounding corridors

### Secondary
- Delivery partners
- Cooperatives, aggregators, and partner financial institutions (as data consumers)

---

## 5. Product Structure (One App)

**Single React Native mobile application** with role-based experiences:

- Buyer mode
- Farmer mode
- (Optional light delivery partner view)

**Do not build a separate credit sub-app.**  
The credit signals live inside the Farmer section of the same app.

---

## 6. Feature Specification (High-Quality MVP)

### 6.1 Marketplace Layer
- Farmer can create listings (crop, quantity, price, harvest window, location)
- Buyer can browse/filter by area, crop, estimated remaining shelf life, price
- Order placement with preferred delivery window
- Order status tracking (Pending → Accepted → Ready → Out for Delivery → Delivered)
- Basic in-app or WhatsApp-linked communication
- Simple ratings after delivery

### 6.2 AI Shelf-Life Intelligence
- Camera-based scan of produce (priority crops first: tomatoes, peppers, leafy greens, maize, selected fruits)
- Returns:
  - Estimated days remaining
  - Short, practical storage recommendations
  - Confidence indicator + clear disclaimer
- Scan can be attached to listings (farmer) or performed on receipt (buyer)
- On-device inference preferred where possible for speed and offline resilience

### 6.3 Farmer Credit & Activity Signals (Integrated)
- Automatic capture of:
  - Listings created and completed
  - Sales volume and frequency
  - Scan activity and consistency
  - Delivery completion rate
- Farmer dashboard shows:
  - Simple activity summary (last 30/90 days)
  - Inventory velocity indicators
  - Consistency score (transparent and explainable)
- Farmer can generate a clean, shareable “Activity Report” (PDF or secure link) that can be sent to banks, cooperatives, or grant programmes
- Clear messaging: “This is supporting evidence based on your real marketplace activity. It does not guarantee a loan.”

### 6.4 Supporting Features
- Phone OTP authentication
- Push notifications for orders, status changes, and short shelf-life alerts
- Basic profile and location management
- Offline-tolerant design for core flows where possible

---

## 7. Technical Architecture (Recommended for Quality)

**Frontend**
- React Native (TypeScript)
- Clean architecture, well-structured navigation
- High-quality UI using a consistent design system (custom or carefully chosen component library)
- Smooth camera integration for scanning

**Backend**
- FastAPI (Python) or Node.js (TypeScript)
- PostgreSQL for structured data
- Object storage for images
- Background jobs for report generation and notifications

**AI / Computer Vision**
- Lightweight model optimized for priority Nigerian produce
- On-device option + server fallback
- Continuous improvement loop with consented data

**Infrastructure**
- Secure authentication
- Proper error handling and logging
- Environment-based configuration
- Basic monitoring

**Quality Standards**
- Clean, readable, well-organized code
- Consistent design language
- Proper loading, empty, and error states
- Accessibility considerations
- Performance on mid-range Android devices common in Nigeria

---

## 8. User Flows (Key Paths)

### Farmer – List + Scan + View Signals
1. Open app → Farmer home
2. Create listing → optional/recommended scan → publish
3. Manage incoming orders
4. View Activity & Signals dashboard
5. Generate and share Activity Report when needed

### Buyer – Discover + Order + Scan on Receipt
1. Browse nearby produce (with shelf-life badges)
2. View details + storage tips
3. Place order
4. Track delivery
5. On receipt: scan items for personal guidance

### Credit Signal Path
1. Farmer builds activity through normal use of the marketplace
2. System aggregates transparent metrics
3. Farmer reviews and generates report
4. Farmer shares report with external party (bank, cooperative, grant body)

---

## 9. Design Principles (Very High Quality)

- Feels intentional and calm, not generic or “startuppy”
- Strong visual hierarchy
- Clear status and feedback
- Excellent empty and loading states
- Typography and spacing are deliberate
- Works well in both bright outdoor and indoor conditions
- Feels like a serious product that respects the user’s time

---

## 10. Out of Scope for Current Version

- Direct lending or loan disbursement
- Complex credit scoring algorithms that claim to replace traditional underwriting
- Multi-city expansion at launch
- Advanced cold-chain hardware integration
- Heavy social features
- Multi-language beyond English + essential local terms

---

## 11. Success Metrics (Early)

- Number of active farmers listing weekly
- Completed orders
- Scan usage rate
- Delivery completion rate
- Number of Activity Reports generated
- Qualitative feedback from farmers on usefulness of signals

---

## 12. Recommended Build Order

1. Core authentication + role selection
2. Farmer listing + basic order flow
3. Buyer browse + order
4. Shelf-life scanning (priority crops)
5. Order status and notifications
6. Activity tracking and simple signals dashboard
7. Report generation and sharing
8. Polish, performance, and edge cases

---

## 13. Hackathon Positioning

**Primary story:**  
“A practical platform that helps farmers sell fresher produce faster while building real activity records that can support access to finance.”

This combination is highly relevant for bank-organized competitions because it touches both real economy (agriculture) and financial inclusion.

---

**End of Specification**

This document is intended to guide a high-quality implementation. Every feature should be built with care, clarity, and respect for the end user.
