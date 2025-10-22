# Project Features Documentation

## Overview
This document describes all major features, modules, and user flows of the project as of October 22, 2025. The platform is a full-stack, onchain-enabled cybersecurity learning and CTF (Capture The Flag) platform with gamified operations, skill paths, and verifiable blockchain certificates.

---

## 1. User Dashboard & Progress Tracking
- **Personalized Dashboard**: Shows user stats (points, rank, streak, badges), active learning, featured content, and quick navigation.
- **Progress Tracking**: Tracks challenges, labs, and skill path completions with real-time updates from Supabase.
- **Leaderboard**: Global ranking based on points and achievements.

## 2. Challenges & Labs
- **Challenges**: Solve cybersecurity challenges of varying difficulty. Each challenge has points, description, and approval workflow.
- **Labs**: Hands-on, scenario-based labs with real infrastructure. Labs can be started, completed, and tracked.
- **Skill Paths**: Structured learning paths combining challenges and labs for guided progression.

## 3. Red vs Blue Operations (Cyber Arena)
- **Live Team Operations**: Red Team (attackers) vs Blue Team (defenders) in real-time simulated cyber battles.
- **Matchmaking**: Join or create match requests, real-time updates via Supabase channels.
- **Operation Labs**: Each operation is based on real-world attack/defense scenarios (e.g., Colonial Pipeline, SolarWinds).
- **Lab Interface**: In-session chat, event feed, timer, and question cards for both teams.

## 4. Onchain Certificates (Base Sepolia)
- **Claim Certificate**: Users who complete a skill path can mint a verifiable ERC-721 NFT certificate on Base Sepolia.
- **Strict SVG Template**: All certificates use a single, official SVG template with dynamic fields (name, course, date).
- **Supabase Claims Table**: All claims are stored in Supabase with tx hash, tokenId, metadata, and user info.
- **My Certificates**: Users can view all their certificates, download SVG, and see onchain tx links.
- **Verifier Page**: Anyone can verify a certificate by tx hash, see status, and view decoded metadata.
- **Multiple RPC Fallbacks**: Robust onchain reads with fallback to multiple public RPCs and chunked log fetching.

## 5. Admin & Content Management
- **Admin Dashboard**: Platform stats, quick actions, and management of challenges, labs, users, and operations.
- **Challenge & Lab Management**: Approve, reject, edit, or delete challenges/labs. Feedback workflow for rejections.
- **Skill Path & Certification Management**: Create and manage learning paths and certifications.
- **Live Lab Sessions**: Monitor and manage active lab sessions in real time.
- **Admin User Management**: Manage admin users and roles.

## 6. Billing & Entitlements (Billing Admin)
- **Products, Prices, Vouchers**: CRUD for billing data, voucher issuance, and redemption analytics.
- **Subscriptions & Purchases**: Track and manage user subscriptions and purchases.
- **Entitlements**: Grant or revoke access to content based on plan or manual grants.
- **Metrics & Diagnostics**: View platform metrics, latency, and diagnostic info.
- **Role Tiers**: Granular admin roles (viewer, content_admin, billing_manager, superadmin).

## 7. Security & Infrastructure
- **Supabase RLS**: Row-level security for all user and admin data.
- **Audit Logging**: Planned for all admin mutations and bulk operations.
- **Multiple Public RPCs**: Fallback and error handling for onchain operations.
- **CORS, SSO/OTP**: Security hardening for admin routes (planned).

## 8. UI/UX & Design System
- **Modern UI**: Uses Tailwind, glass-effect cards, and design system classes for a professional look.
- **Responsive Layouts**: Mobile and desktop optimized.
- **Loading & Error States**: Friendly, actionable error messages and loading screens.

## 9. Extensibility & Roadmap
- **CTF Integration**: Designed for future CTF events and custom operations.
- **Webhook & Reconciliation**: Planned dashboards for external processor integration.
- **Bulk Operations**: Planned for mass voucher generation and entitlement grants.

---

## User Flows
- **Register/Login** → **Dashboard** → **Challenges/Labs/Skill Paths** → **Complete** → **Claim Certificate** → **View/Share/Verify**
- **Red vs Blue**: Join operation → Team assignment → Live session → Chat, answer, compete → Results
- **Admin**: Login → Dashboard → Manage content/users/operations → Approve/reject → Monitor sessions
- **Billing Admin**: Login → Manage products, vouchers, entitlements, metrics

---

## Technology Stack
- **Frontend**: React 18, Vite, TypeScript, Tailwind, Framer Motion
- **Backend**: Supabase (Postgres, RLS, Realtime)
- **Onchain**: wagmi v2, viem, ethers, Base Sepolia
- **Other**: React Query, React Router, Lucide Icons

---

## For more details, see the README.md and code comments in each module.
