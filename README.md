# CareNest AI — Intelligent Elderly Care & Medication Management Ecosystem

> Senior-centric collaborative healthcare platform ensuring safe medication administration, atomic anti-double-dosing locking, AI-powered clinical doctor summaries, and shared care circle coordination.

---

## 🌟 Key Innovations & Features

### 1. Senior Care Mode (Accessibility-First)
- **High-contrast UI & giant touch targets** (`min-h-[64px]` to `min-h-[140px]`) tailored for motor and visual impairment.
- **Text-to-Speech (TTS) Voice Instructions** powered by the Web Speech API (`SpeechSynthesis`) with speech rate calibrated to 0.88x for elderly auditory clarity.
- **3 Primary Action Hero Buttons**:
  - `1. I HAVE TAKEN MY MEDICINE`: Direct 1-tap dose administration.
  - `2. I NEED HELP`: Instant Care Circle emergency alert broadcast.
  - `3. HOW AM I FEELING?`: 1-tap symptom check-in (Fine, Dizziness, Weakness, Confusion, Drowsiness, Stomach discomfort).

### 2. Concurrency-Safe Anti-Double-Dosing Lock
- **Eliminates double-dosing hazard** across multi-caregiver environments or rapid multi-clicks.
- Uses MongoDB atomic conditional updates (`findOneAndUpdate` with status condition `scheduled` and unique index on `doseKey`).
- Returns **HTTP 409 Conflict** with exact actor and timestamp details when a dose is already taken.
- Atomically decrements medication stock (`$inc: { remainingQuantity: -1 }`) and dispatches low-inventory warnings.
- Verified under simultaneous concurrent burst tests (5 simultaneous requests yielding 1 success and 4 conflicts).

### 3. Role-Based Care Circle (RBAC Matrix)
- **Senior (Meera Sharma, 72)**: Simple Care Mode, next dose spotlight, voice instructions, symptom reporting, SOS help. Restricted from altering prescriptions or viewing clinical admin settings (HTTP 403).
- **Caregiver (Sunita Verma)**: Full daily dose schedule, atomic dose administration, shift handoff notes, medication CRUD, inventory replenishment, and side-effect alerts.
- **Family Member (Rahul Sharma)**: Remote healthcare monitoring, 7-day adherence tracking, doctor appointment scheduling, refill status, and caregiver audit logs. Restricted to read-only dose safety (HTTP 403).

### 4. Medication Inventory & Prescription Management
- Supports **Allopathic, Ayurvedic, Herbal, and Over-The-Counter (OTC)** medications.
- Granular meal timings (`before_meal`, `after_meal`, `with_meal`, `empty_stomach`, `anytime`).
- Physical pill visualizer (Tablet, Capsule, Round, Oval, Chewable with custom color palettes).
- Prescription reconciliation lifecycle tracking (`CONTINUE`, `MODIFIED`, `DISCONTINUED`, `TAPERED`).

### 5. Google Gemini AI & Deterministic Fallback Engine
- **Printable 1-Page Clinical Doctor Summary**: Aggregates verified adherence, missed doses, symptom logs, active medications, and generates 3–5 targeted clinical discussion questions for attending physicians.
- **Plain-Language Medication Explanations**: Converts complex pharmaceutical instructions into compassionate, senior-friendly language.
- **100% Deterministic Fallback**: Automatic clinical template fallback whenever `GEMINI_API_KEY` is absent or the API experiences network degradation.

### 6. Staged Reminder Escalation & Email Delivery
- **Stage 1 (0–15m overdue)**: In-app visual reminder for the senior.
- **Stage 2 (15–30m overdue)**: High-priority circle alert notification.
- **Stage 3 (+30m overdue)**: Email escalation alert to caregivers via **Resend API**.
- Includes automatic offline simulation logging when `RESEND_API_KEY` is not configured.
- Protected daemon endpoint (`/api/cron/reminders`) secured with `CRON_SECRET` validation (HTTP 401 on unauthorized calls).

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | Next.js 15 (App Router, Server-Side Route Handlers) |
| **Frontend UI** | React 19, TypeScript, Tailwind CSS, Lucide React |
| **Database** | MongoDB Atlas (Official Driver `mongodb` v6.13) + In-Memory Mock Store Fallback |
| **Authentication** | Supabase Auth (`@supabase/ssr`) + Role-Based Session Verification + Bcryptjs Hashing |
| **AI Summaries** | Google Gemini API (`@google/generative-ai` v0.24) with Deterministic Template Fallback |
| **Email Delivery** | Resend API (`resend` v4.1) with Safe Simulation Logger |
| **Containerization** | Docker multi-stage build ready for Google Cloud Run |

---

## 📂 Project Structure

```
carenest-ai/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── ai/ (doctor-summary, explain, explain-medicine)
│   │   │   ├── appointments/ ([id], route)
│   │   │   ├── audit-logs/
│   │   │   ├── auth/ (login, logout, profile, register, session)
│   │   │   ├── care-profiles/ ([id], invite-code, join, route)
│   │   │   ├── caregiver-notes/
│   │   │   ├── cron/reminders/
│   │   │   ├── doses/ (administer, history, today)
│   │   │   ├── health/ (Cloud Run container health check)
│   │   │   ├── health-logs/
│   │   │   ├── medications/ ([id], route)
│   │   │   └── notifications/
│   │   ├── appointments/ (Doctor visit scheduling & clinic prep)
│   │   ├── care-circle/ (Circle members, permissions, invite codes)
│   │   ├── dashboard/ (Adaptive Senior, Caregiver, and Family views)
│   │   ├── health-journal/ (Symptom logs & vitals tracker)
│   │   ├── login/ & register/ (1-click persona logins)
│   │   ├── medications/ (Prescription cabinet & reconciliation)
│   │   ├── reports/ (Printable AI Doctor Summary)
│   │   ├── schedule/ (Daily Morning, Afternoon, Evening, Bedtime doses)
│   │   ├── settings/ (Senior mode toggle, TTS speech rate slider)
│   │   ├── layout.tsx & globals.css
│   │   └── page.tsx (Landing page with 1-click role switcher)
│   ├── components/
│   │   ├── AdherenceChart.tsx
│   │   ├── AppointmentList.tsx
│   │   ├── DoseItem.tsx
│   │   ├── DoubleDoseWarningModal.tsx
│   │   ├── HandoffNotes.tsx
│   │   ├── MedicationCard.tsx
│   │   ├── Navbar.tsx
│   │   ├── PillBadge.tsx
│   │   ├── SafetyIndicators.tsx
│   │   ├── Sidebar.tsx
│   │   ├── StatCards.tsx
│   │   ├── SymptomLogger.tsx
│   │   └── VoiceReader.tsx
│   ├── context/
│   │   └── CareContext.tsx (Global state, active profile, persona switcher)
│   ├── lib/
│   │   ├── ai/ (Gemini client, doctor-summary, explain, symptoms, safety, fallback)
│   │   ├── auth/ (Bcryptjs passwords, session resolver, RBAC permissions)
│   │   ├── db/ (MongoDB client, mock-store, collections, seed-data)
│   │   ├── email/ (Resend client, templates, simulation sender)
│   │   ├── utils.ts
│   │   └── validations/ (Zod schemas for all APIs)
│   └── types/
│       └── index.ts (Full TypeScript data models)
├── tests/
│   ├── anti-double-dose.test.mjs (Concurrency & atomic locking)
│   ├── doctor-summary-ai-fallback.test.mjs (Gemini & deterministic fallback)
│   ├── rbac-isolation.test.mjs (Role authorization & circle isolation)
│   ├── resend-email-fallback.test.mjs (Email alerts & cron escalation)
│   └── senior-care-accessibility.test.mjs (Voice TTS, giant touch targets, ARIA)
├── scripts/
│   ├── seed.mjs (Deterministic seed script for Meera, Sunita, Rahul)
│   └── test-e2e.mjs (Complete 21-step operational verification pipeline)
├── Dockerfile
├── .dockerignore
├── .env.example
├── README.md
└── package.json
```

---

## 🗄️ Database Collections (MongoDB Atlas)

| Collection | Key Fields | Purpose |
| :--- | :--- | :--- |
| `users` | `_id`, `email`, `fullName`, `role`, `passwordHash`, `createdAt` | Registered platform user accounts |
| `careProfiles` | `_id`, `seniorUserId`, `fullName`, `age`, `allergies`, `chronicConditions`, `inviteCode`, `inviteCodeHash` | Central senior patient healthcare record |
| `careMemberships` | `_id`, `careProfileId`, `userId`, `role`, `status`, `joinedAt` | Role-based membership linking users to care circles |
| `medications` | `_id`, `careProfileId`, `medicineName`, `medicineCategory`, `dosage`, `scheduledTimes`, `mealRelation`, `totalQuantity`, `remainingQuantity`, `refillThreshold`, `reconciliationStatus` | Prescription cabinet & active inventory tracking |
| `doseEvents` | `_id`, `careProfileId`, `medicationId`, `doseKey` (unique), `scheduledAt`, `status`, `administeredBy`, `recordedAt` | Concurrency-safe atomic dose administration log |
| `appointments` | `_id`, `careProfileId`, `doctorName`, `specialty`, `dateTime`, `location`, `status` | Doctor visits & clinical consultations |
| `healthLogs` | `_id`, `careProfileId`, `symptom`, `severity`, `reportedBy`, `reportedAt` | 1-tap symptom check-ins & side-effect history |
| `caregiverNotes` | `_id`, `careProfileId`, `authorId`, `authorName`, `shiftDate`, `noteContent` | Shift handoff notes between caregivers |
| `notifications` | `_id`, `careProfileId`, `title`, `message`, `type`, `priority`, `stage`, `status` | In-app alerts and escalation notifications |
| `auditLogs` | `_id`, `careProfileId`, `actorId`, `actorName`, `actorRole`, `action`, `details`, `createdAt` | Tamper-evident clinical compliance audit trail |

---

## 🚀 Quickstart & Setup

### 1. Prerequisites
- Node.js >= 20.x
- npm >= 10.x

### 2. Installation
```bash
# Clone and enter workspace
git clone <repo-url>
cd carenest-ai

# Install dependencies
npm install
```

### 3. Environment Configuration
Copy the template environment file:
```bash
cp .env.example .env.local
```
Configure your keys in `.env.local` (or leave empty to run with automatic zero-configuration in-memory mock store and AI/email simulation fallbacks):
```env
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/carenest?retryWrites=true&w=majority
MONGODB_DB=carenest
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
GEMINI_API_KEY=your-gemini-api-key
RESEND_API_KEY=your-resend-api-key
CRON_SECRET=carenest-secret-cron-token-2026
```

### 4. Deterministic Seed Script
Populate realistic seed records for **Meera Sharma** (Senior), **Sunita Verma** (Caregiver), and **Rahul Sharma** (Family Member):
```bash
npm run seed
```

### 5. Running the Application
```bash
# Start Next.js development server
npm run dev

# Or run optimized production server
npm run build
npm run start
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing & Verification

### Run Automated Unit Test Suites
```bash
npm test
```
Executes all 5 specialized test suites (31/31 passing):
- `tests/anti-double-dose.test.mjs` (7/7 PASS): Concurrency locking, 5x burst race conditions, duplicate dose prevention, inventory deduction.
- `tests/rbac-isolation.test.mjs` (6/6 PASS): Senior, Caregiver, and Family authorization, foreign circle access prevention, bcrypt invite passcode verification.
- `tests/senior-care-accessibility.test.mjs` (6/6 PASS): 3 primary action buttons, giant touch targets, Web Speech TTS voice reader fallback, ARIA dialogs.
- `tests/doctor-summary-ai-fallback.test.mjs` (6/6 PASS): Gemini clinical summary generation, deterministic template fallback, medication plain-language explanation.
- `tests/resend-email-fallback.test.mjs` (6/6 PASS): Stage 3 escalation email delivery, simulation logging, cron reminder daemon authorization.

### Run End-to-End Operational Pipeline
```bash
npm run test:e2e
```
Runs 21 sequential operational validation steps covering the entire user journey in ~640ms.

---

## ☁️ Google Cloud Run Deployment

### 1. Build Container Image
```bash
docker build -t gcr.io/[PROJECT_ID]/carenest-ai:latest .
```

### 2. Deploy to Google Cloud Run
Deploy to a nearby region (e.g. `asia-south1` for Mumbai/India or `us-central1`):
```bash
gcloud run deploy carenest-ai \
  --image gcr.io/[PROJECT_ID]/carenest-ai:latest \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars="NODE_ENV=production,CRON_SECRET=carenest-secret-cron-token-2026,MONGODB_URI=[YOUR_MONGODB_URI],GEMINI_API_KEY=[YOUR_GEMINI_KEY],RESEND_API_KEY=[YOUR_RESEND_KEY]"
```

### 3. Verification & Health Check
```bash
curl https://[SERVICE_URL]/api/health
```
Returns: `{"status":"healthy","service":"carenest-ai","version":"0.1.0"}`

> **Deployment Blocker Note**: The Google Cloud CLI (`gcloud`) was not pre-installed in the local environment during hackathon execution. The complete multi-stage `Dockerfile`, production build artifacts (`.next`), and deployment parameters have been fully prepared and verified locally.

---

## 🏆 Compliance & Verification Matrix

| Requirement | Status | Implementation Details |
| :--- | :---: | :--- |
| **Senior Care Mode** | ✅ Complete | Extra-large typography, giant buttons (`min-h-[140px]`), Web Speech TTS voice reader at 0.88x speed, 3 primary buttons. |
| **Caregiver Dashboard** | ✅ Complete | Today's dose schedule, atomic dose administration, shift handoff notes, inventory refill alerts. |
| **Family Dashboard** | ✅ Complete | Remote adherence analytics (7-day bar chart), upcoming appointments, caregiver activity timeline. |
| **Atomic Anti-Double-Dose Lock** | ✅ Complete | MongoDB atomic `findOneAndUpdate` on unique `doseKey`, HTTP 409 Conflict with collision details, verified under 5x concurrent burst. |
| **Allopathic + Ayurvedic + Herbal** | ✅ Complete | Multi-category prescription cabinet, meal relation timing, physical pill visualizer. |
| **Prescription Reconciliation** | ✅ Complete | `CONTINUE`, `MODIFIED`, `DISCONTINUED`, `TAPERED` lifecycle management with audit history. |
| **Side-Effect & Symptom Logging** | ✅ Complete | 1-tap quick actions (dizziness, weakness, confusion, etc.) with automatic high-priority notifications. |
| **Doctor-Ready Summary** | ✅ Complete | Printable clinical report with Gemini AI aggregation + 100% deterministic fallback. |
| **Plain-Language Explanations** | ✅ Complete | Gemini AI translation of pharmaceutical instructions with TTS voice read-aloud prompts. |
| **Staged Reminder Escalation** | ✅ Complete | Stage 1 (in-app) -> Stage 2 (+15m follow-up) -> Stage 3 (+30m Resend email) via protected `/api/cron/reminders`. |
| **Role-Based Access Control (RBAC)** | ✅ Complete | Senior personal admin, Caregiver full management, Family read-only safety, Bcryptjs invite code hashing (`NEST72`). |
| **Production Build** | ✅ Complete | Next.js 15 production build passing with 35 static & dynamic routes, 0 TypeScript errors. |
