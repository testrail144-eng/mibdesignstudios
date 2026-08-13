# Groundwork — Site & Vendor Ledger

A construction / interior-renovation project management app for small studios and contractors.
Track money, vendors, purchase orders, quotations, payments, daily logs, snags and tasks for
every site — with real multi-user accounts, roles, and live cross-device sync.

Built with **Next.js** (React) on the front end and **Firebase** (Auth + Firestore + Storage)
on the back end. Deploy-ready for **Vercel**.

---

## Features

- **Multi-site projects** — each site has its own BOQ, vendors, POs, quotations, payments, logs, snags, tasks and invoices.
- **Accounts & roles** — email + password login. The first account created becomes **Admin**; everyone else joins as **Staff**. Staff see a reduced, cost-free view (no BOQ, quotations, payments, invoices or vendor amounts).
- **Overview & BOQ** — cost by trade with estimated vs. expensed and variance.
- **Quotations** — multi-section estimates (A, B, C…), line items with area × unit price, status workflow (Draft → Sent → Negotiation → Accepted/Rejected), revision duplication, and PDF download.
- **Payments** — contract value, payment milestones, received vs. invoiced vs. pending.
- **Vendors & Purchase Orders** — vendor directory with pending/received amounts, full POs (GST, payment terms, line items), one-tap **WhatsApp** / email, and PDF download.
- **Invoices** — GST invoices for clients with tax, discount, notes and payment details, PDF download.
- **Daily site log** — reports, next-day plans, and photos (compressed and stored in Firestore).
- **Snags** — punch-list items with photo, assignee and open/fixed state.
- **Tasks** — assignable to staff, with due dates and status.
- **Dashboard** — cross-site analytics: spend, variance and budget-used bars per project.
- **Live sync** — every screen subscribes to Firestore in real time; a change on one device appears instantly on all others.

---

## Setup (local development)

1. **Create a Firebase project** at [console.firebase.google.com](https://console.firebase.google.com/).
   - Enable **Authentication → Sign-in method → Email/Password**.
   - Enable **Firestore Database** (production or test mode — rules are provided below).
   - Add a **Web app** to get your config values.

   > **No Storage needed.** The app runs entirely on the free **Spark** plan — photos
   > are compressed and stored inside Firestore, so there's no need to enable
   > Firebase Storage or upgrade to the paid plan.

2. **Configure environment variables.** Copy `.env.local.example` to `.env.local` and fill in your values:

   ```bash
   cp .env.local.example .env.local
   ```

   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
   NEXT_PUBLIC_FIREBASE_APP_ID=...
   ```

3. **Deploy the security rules.** In the Firebase console, paste the contents of
   `firestore.rules` into **Firestore → Rules**. Publish.

4. **Install and run.**

   ```bash
   npm install
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). Create your first account (it becomes Admin),
   then add a site and start working.

---

## Deploying to Vercel

1. Push this repo to GitHub (a **private** repo is recommended — see note below).
2. On [vercel.com](https://vercel.com), **Add New → Project → Import** the repo.
3. Vercel auto-detects Next.js. In **Environment Variables**, add the six `NEXT_PUBLIC_FIREBASE_*` values from your `.env.local`.
4. **Deploy.** You'll get a URL like `https://your-app.vercel.app`.

Every device that opens the URL shares the same Firebase data — log in and everything syncs.

---

## Security notes

- Firebase config values (`NEXT_PUBLIC_*`) are **public** — they ship to every browser. Access control comes entirely from the **security rules**, which are what enforce "staff can't read costs" and "only admins write financial data".
- Keep your GitHub repo **private** so only invited people can read the source. Anyone you invite to the app (by them creating an account) is a **staff** member until you promote them in **Team**.
- To onboard a staff member: just have them open the URL and tap **Create an account**. They appear in your **Team** tab, where you can promote them if needed.

---

## Project structure

```
app/                  Next.js App Router (layout, entry page)
components/           UI (shell, login, sidebar, panels per feature)
lib/                  Firebase init, auth context, data hooks, image compression, formatting
firestore.rules       Firestore security rules
.env.local.example    Environment variable template
```
