# MARINAUT

**Digital Vessel Compliance Platform**

Digital fine management for **launches, cargo ships and boats**. **Naval Police** issue digital fines to vessels at ghats and on rivers, owners pay online, and anyone can check a vessel's unpaid fines by its registration number (e.g. `M-15245`).

**Stack:** Node.js + Express 5 + MongoDB (Mongoose) · React 19 + Vite + Tailwind CSS v4 · JWT auth

---

## Features

### Three separate portals

| Portal | Login / Register | Registration rule |
|---|---|---|
| **Vessel Owner** | `/login`, `/register` | Account is active immediately after registering |
| **Naval Police** | `/police/login`, `/police/register` | Badge number required; can log in only **after admin approval** |
| **Admin** | `/admin/login`, `/admin/register` | Requires the `ADMIN_REGISTRATION_KEY` from `.env` |

Each portal only lets accounts of its own role log in (for example, an admin cannot log in through the owner portal).

| Role | What they can do |
|---|---|
| **Public** (no login) | Check unpaid fines by registration number, verify a receipt |
| **Vessel Owner** | Add/edit own vessels, view own fines, pay online (bKash/Nagad/Rocket/Card, demo mode), download receipts |
| **Naval Police** | Issue fines, view all vessels/fines/payments, view the violation list |
| **Admin** | Everything, plus the **Audit log**, approve/reject Naval Police registrations, create/activate/deactivate/remove users, manage violation types, suspend vessels, cancel fines, record cash payments |

### Business rules (`backend/utils/config.js`)
- **Registration number format:** one letter + a dash + any number of digits (e.g. `M-15245`, `B-7`, `K-1234567`)
- **Fine number:** generated automatically, e.g. `MRN-2026-000001`
- **Payment time limit:** a fine must be paid within **30 days** of being issued
- **Growing late fee:** after the time limit, **5%** of the base amount is added, then **another 5% every 30 days**
  - Repeat offences grow by **10%** instead
  - Example: ৳50,000 fine paid 70 days late → 3 periods × 5% = ৳7,500 → payable ৳57,500
  - Logic: `backend/utils/lateFee.js` (not stored in the database; calculated on every request, so it is always up to date)
- **Repeat offence:** the same vessel committing the same offence again within 1 year is charged **2×**
- Each fine keeps a copy of the violation's title and amount, so changing a violation later does not change existing fines
- A fine can never be paid twice
- **Capacity unit is locked by vessel type:** Launch / Passenger Vessel / Boat → **passengers**, Cargo Ship / Tanker → **tons**, Other → chosen by the owner
- **Deleting a vessel that has fines:** the admin sees how many fines/payments will be removed and must **type the registration number** to confirm; the vessel and all its fines and payments are then permanently deleted
- **Removing users (admin):**
  - Users with no linked records → removed directly
  - A Vessel Owner with vessels/fines → admin must **type the owner's email** to confirm; the owner and all their vessels, fines and payments are permanently deleted
  - Naval Police / Admins who issued fines or recorded cash payments → cannot be removed (other owners' fine records would break); deactivate them instead
  - Admins cannot remove themselves or the last admin
  - ⚠️ A force delete also removes that money from collection totals and reports

### Design
- **Name + tagline:** `frontend/src/brand.js` (change it once and the whole app updates)
- **Logo:** `frontend/src/components/Logo.jsx` (SVG: shield + vessel + waves), favicon: `frontend/public/favicon.svg`
- **Font:** Inter (`@fontsource-variable/inter`, bundled with the app, so it works offline)
- **Homepage:** hero + live stats (`/api/public/stats`), How it works, Features, Portals, call to action, footer
- **Dashboard chart:** y-axis, hover tooltip, "Table view" (`frontend/src/components/charts.jsx`)
- **Where colors live:** portal backgrounds → `src/portals.js`, main "navy" theme → `src/index.css`, buttons/badges → `src/components/ui.jsx`

### Audit log (Admin → Audit Log)
Records who did what and when for every important action: logins (successful and failed), wrong admin keys, registrations, user approve/reject/activate/remove, vessel add/edit/suspend/remove, violation add/edit, fine issue/cancel, and payments.
- Edits show **what changed** (e.g. Amount: ৳5,000 → ৳6,000)
- **Read-only:** the API has no edit/delete routes; entries remain even after a user or vessel is deleted (names are copied into the log)
- Category tabs, search (person, email, registration no., fine no., transaction ID), date range filter, IP address

### PDF receipt + QR verification
- **Download PDF** on the receipt page; the PDF contains a QR code
- Scanning the QR opens `/verify/<transactionId>` (no login needed):
  - ✅ **Genuine receipt** → amount, date, vessel, fine number
  - ❌ **Receipt not found** → the receipt is fake
- The owner's email/phone is never shown on the verify page
- **Fine notice PDF** on the fine page; scanning its QR opens the homepage and automatically searches that vessel's unpaid fines
- Transaction IDs can also be typed in manually at `/verify`
- ⚠️ When running locally, the QR contains an `http://localhost:5173/...` link, which will not open on a phone. After deployment it uses the live domain.

---

## Folder structure

```
marinaut/
├── backend/
│   ├── config/db.js
│   ├── controllers/      auth, user, vessel, violation, fine, payment, public, dashboard, audit
│   ├── middleware/       authMiddleware (protect + authorize), errorHandler
│   ├── models/           User, Vessel, Violation, Fine, Payment, Counter, AuditLog
│   ├── routes/
│   ├── seed/seed.js      demo data
│   ├── tests/api.test.js 42 automated API tests
│   ├── utils/            config, lateFee, cascade, audit, AppError, pagination, token
│   ├── app.js            Express app (routes, middleware)
│   └── server.js         DB connection + start server
├── frontend/
│   └── src/
│       ├── brand.js            product name + tagline
│       ├── portals.js          config for the 3 portals (URL, API, colors)
│       ├── utils/pdf.js        receipt + fine notice PDFs, QR codes (jspdf, qrcode)
│       ├── api/client.js       axios + token interceptor
│       ├── context/            AuthContext, ToastContext
│       ├── components/         Layout, UI kit, tables, forms, charts, logo
│       └── pages/              Landing, PortalLogin, PortalRegister, VerifyReceipt, AuditLog, Dashboard, Vessels, Fines, IssueFine, FineDetail, Payments, Receipt, Violations, Users
├── marinaut-api.postman_collection.json
└── README.md
```

---

## Setup (Windows PowerShell)

**Requires Node.js 20+.**

### 1. Backend
```powershell
cd backend
npm install
copy .env.example .env      # then set MONGO_URI, JWT_SECRET and ADMIN_REGISTRATION_KEY in .env
npm run seed                # demo data (only if the database is empty)
npm run dev                 # http://localhost:5000
```

### 2. Frontend (in a new terminal)
```powershell
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

Vite proxies `/api` requests to the backend, so the frontend needs no `.env` file.

### Demo logins (after `npm run seed`)

| Portal | Email | Password |
|---|---|---|
| Admin (`/admin/login`) | admin@marinaut.gov.bd | admin123 |
| Naval Police (`/police/login`) | police@marinaut.gov.bd | police123 |
| Vessel Owner (`/login`) | owner@marinaut.com | owner123 |

`police3@marinaut.gov.bd` is left pending, so you can test approval in the admin's **Users → Pending approval** tab.

Demo registration numbers: `M-15245`, `M-20871`, `M-33019`, `M-41762`

> Change the demo passwords before any real use.

`npm run seed:fresh` **deletes all data** and inserts the demo data again.

### Tests
Set `MONGO_URI_TEST` in `.env` (a **separate** database!), then:
```powershell
cd backend
npm test
```

---

## API endpoints

Protected routes need the header `Authorization: Bearer <token>`.

| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/` | public | Health check |
| POST | `/api/auth/register` | public | Vessel Owner registration (role is always `owner`) |
| POST | `/api/auth/login` | public | Vessel Owner login |
| POST | `/api/auth/police/register` | public | Naval Police registration (`badgeNumber` required) → pending |
| POST | `/api/auth/police/login` | public | Naval Police login (must be approved) |
| POST | `/api/auth/admin/register` | public | Admin registration (`adminKey` required) |
| POST | `/api/auth/admin/login` | public | Admin login |
| GET | `/api/auth/me` | any | Current user |
| GET | `/api/public/fines/:regNo` | public | Unpaid fine lookup |
| GET | `/api/public/stats` | public | Homepage numbers (vessels, fines, collection, paid %) |
| GET | `/api/public/verify/:transactionId` | public | Receipt verification (QR) — `valid: true/false` |
| GET | `/api/audit-logs?entityType=&action=&search=&from=&to=&page=` | admin | Audit log (read-only) |
| GET | `/api/dashboard` | any | Stats for the current role |
| GET | `/api/users?role=&approvalStatus=&search=` | admin | User list; search by name / email / phone / badge |
| POST | `/api/users` | admin | Create a Naval Police/admin/owner account (approved immediately) |
| PATCH | `/api/users/:id/approval` | admin | `{ status: "approved" \| "rejected" }` |
| PATCH | `/api/users/:id/status` | admin | `{ isActive }` |
| DELETE | `/api/users/:id` | admin | Remove a user. Owner with records → 400 + `canForce`; `?force=true&confirm=<email>` deletes everything |
| GET | `/api/vessels?search=&status=&vesselType=&page=` | any | Owner: own vessels, staff: all |
| POST | `/api/vessels` | owner / admin | Staff must send `ownerEmail` |
| GET | `/api/vessels/:id` | any* | Vessel + fine summary |
| PATCH | `/api/vessels/:id` | owner* / admin | Name, type, route, capacity (`capacityUnit` only for type Other) |
| PATCH | `/api/vessels/:id/status` | admin | `{ status: "Suspended" }` |
| DELETE | `/api/vessels/:id` | admin | Has fines → 400 + `canForce`; `?force=true&confirm=<reg no>` deletes it with its fines and payments |
| GET | `/api/violations?active=true` | any | Offence catalog |
| POST / PATCH / DELETE | `/api/violations[/:id]` | admin | DELETE = soft delete (inactive) |
| GET | `/api/fines?status=Unpaid\|Paid\|Cancelled\|Overdue&search=` | any | Owner: fines of own vessels |
| POST | `/api/fines` | police / admin | `{ registrationNumber, violationId, location, notes }` |
| GET | `/api/fines/:id` | any* | Fine + `lateFeeInfo` (periods, rate, next increase date) + `totalPayable` |
| PATCH | `/api/fines/:id/cancel` | admin | `{ reason }` |
| POST | `/api/payments/fine/:fineId` | owner* / admin | `{ method: "bKash" }` (admin: `Cash`) |
| GET | `/api/payments` | any | Owner: own payments |
| GET | `/api/payments/:id` | any* | Receipt |

\* Owners can only access their own vessels/fines (anything else returns 403).

**Error format:** `{ "message": "...", "errors": [...] }` · 400 validation · 401 missing/invalid token · 403 wrong role · 404 not found · 409 duplicate

---

## Future work
- Real payment gateway (bKash / SSLCommerz sandbox), plugged into `paymentController.payFine`
- SMS/email notifications (to owners when a fine is issued, to Naval Police when approved)
- Evidence photo upload (Naval Police)
- Auto-suspend vessels with multiple unpaid fines
- Deployment: backend → Render, frontend → Vercel/Netlify
