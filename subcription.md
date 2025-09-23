# Subscriptions & Payments — What We’re Building and Why It Matters

We’re adding subscriptions and payments to unlock growth while keeping the experience simple for users and flexible for the business.

## What users will experience
- Clear access: Free content is open. Premium content shows a simple “Upgrade” option. Certifications show “Included,” “Buy voucher,” or “Redeem code.”
- Smooth checkout: Local payment methods where it matters (cards globally, UPI in India), quick purchase, instant access.
- Immediate unlocks: After a successful payment, access is granted automatically—no waiting, no manual steps.
- Self‑service: A billing section to view plan, renewal date, and manage/cancel.

## What the business can do
- Sell Plans and One‑Time Purchases
  - 2–3 monthly plans (e.g., Basic/Pro/Elite) with regional pricing.
  - One‑time purchases: certification vouchers, individual Red vs Blue operations, or seasonal passes.
- Make Smart Bundles
  - Include specific certifications in certain plans—or unlock all certifications with a higher tier.
  - Gate certain challenge packs or Red vs Blue operations to specific plans.
- Run Promotions and Vouchers
  - Generate and redeem voucher codes for certifications or operations.
- Switch Payment Providers Easily
  - Use Stripe globally and Razorpay for UPI in India (or change later) without disrupting the app.

## Why this design is future‑proof
- The app never depends on a specific payment provider. It grants “entitlements” (access tokens) after a verified payment.
- Changing pricing, plans, or providers is a catalog change in the internal admin, not a code rewrite.
- We can run multiple providers at once (e.g., Stripe + Razorpay) and route by region.

## Red vs Blue made flexible
- Some operations can be free to attract users.
- Others can be included in plans (Pro/Elite), or sold separately as one‑time purchases.
- Seasonal passes can unlock a bundle of operations at once.

## Certifications done right
- Practical certifications can be included in a plan or bought via voucher—your choice.
- Users see exactly what’s included before they pay.

## Control in your hands (internal admin)
- A separate Billing Admin interface lets the team manage products, prices, vouchers, subscriptions, and logs—securely on the internal network.

## What success looks like
- Higher conversion through transparent paywalls and local payment methods.
- Lower support load via self‑service billing and automatic unlocks.
- Flexibility to test pricing, bundles, and promotions without engineering cycles.

If you want a brief demo for stakeholders, we can show: upgrading to a plan, buying a voucher, unlocking a certification, and joining a premium Red vs Blue operation—all in minutes.
