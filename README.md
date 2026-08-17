# Groundwork — Site & Vendor Ledger

A construction / interior-renovation project management app for small studios and contractors.
Track money, vendors, purchase orders, quotations, payments, daily logs, snags, attendance,
expenses and tasks for every site — with real multi-user accounts, roles and live cross-device sync.

Built with **Next.js** (React) on the front end and **Firebase** (Auth + Firestore) on the back end.
Deploy-ready for **Vercel**.

---

## Features

- **Multi-site projects** — each site has its own BOQ, vendors, POs, quotations, payments, logs, snags, tasks, expenses and invoices.
- **Editable app/site name** — admins can change the name in Studio settings; it updates the signed-in sidebar and browser tab.
- **Accounts & roles** — email + password login. The first account becomes Admin; later accounts start as Staff. Admins can prepare a role invitation and promote existing accounts.
- **Quotations** — separate room/area subsections, work-package sections, particulars, detailed descriptions, area × unit price, status workflow, revision duplication and PDF download.
- **Dashboard** — admin-only cross-site cards for sites, team, snags, visits, BOQ budget, expenses, invoices, vendor payables, tasks and recent additions.
- **Site attendance** — members take arrival and departure photos from the device camera. Each photo is compressed, visibly stamped with the site and time, and stored with the member and exact timestamp.
- **Expenses** — staff see their own expense entries; admins see staff and admin expenses separately, with status review and the member who added every entry.
- **Snags and daily logs** — photo credits and “added by” metadata are stored and shown, including legacy fallback text for older records.
- **Email notifications** — every new site record creates an admin audit event and can send a Gmail-to-Gmail notification containing what was added, the site, time and member who added it.
- **Live sync** — every screen subscribes to Firestore in real time; a change on one device appears instantly on other devices.

---

## Setup (local development)

1. **Create a Firebase project** at [console.firebase.google.com](https://console.firebase.google.com/).
   - Enable **Authentication → Sign-in method → Email/Password**.
   - Enable **Firestore Database** (Native mode).
   - Add a Web app to get the browser config values.

   > **No Firebase Storage is required.** Photos are compressed and stored in Firestore so the app can run on the free Spark plan. Keep images modest because Firestore documents have a 1 MB limit.

2. **Configure environment variables.** Copy `.env.local.example` to `.env.local` and fill in the six `NEXT_PUBLIC_FIREBASE_*` values.

3. **Deploy the security rules.** Paste `firestore.rules` into **Firestore → Rules** and publish them. The role-promotion fix will not work until these updated rules are published.

4. **Optional Gmail notifications.** Create a Google App Password for the Gmail sender and set `GMAIL_USER`, `GMAIL_APP_PASSWORD` and optionally `NOTIFY_TO`. The server route also needs Firebase Admin credentials (`FIREBASE_SERVICE_ACCOUNT_JSON`, or `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY`) to verify signed-in users. Never put the Gmail password in `NEXT_PUBLIC_*` variables.

5. **Install and run.**

   ```bash
   cp .env.local.example .env.local
   npm install
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). Create your first account (it becomes Admin), then add a site and start working.

---

## Team onboarding

An admin opens **Team → Add team member**, enters the member email and selects Staff or Admin. The member then opens the app and creates an account using that exact email. The invited role is applied automatically. Existing accounts can be promoted from the People table.

Firebase Auth user creation is intentionally not performed from the admin browser: this avoids handling or exposing another person’s password.

---

## Deploying to Vercel

1. Push this repo to GitHub (a **private** repo is recommended).
2. On [vercel.com](https://vercel.com), import the repo as a Next.js project.
3. Add the six browser Firebase variables and the server-only Gmail/Firebase Admin variables from `.env.local.example`.
4. Deploy. In Firebase, publish `firestore.rules` and make sure the Vercel deployment URL is in Firebase Authentication → Settings → Authorized domains.

---

## Project structure

```
app/                  Next.js App Router, metadata and /api/notify email route
components/           UI shell and feature panels
lib/                  Firebase init, Auth context, data hooks, image/activity helpers
firestore.rules       Firestore security rules
.env.local.example    Environment variable template
```
