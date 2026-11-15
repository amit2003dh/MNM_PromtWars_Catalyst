# CareNest AI — Elderly Care & Medication Management Platform

CareNest AI is a collaborative healthcare web application designed to eliminate medication mismanagement among seniors. It bridges the gap between elderly patients, family members, and professional caregivers through atomic double-dose prevention, accessibility-first design, role-based circle coordination, AI clinical summaries, and real-time emergency alert escalations.

---

## Recent Updates & Changelog

The following major systems and architectural upgrades were recently implemented across the platform:

1. **Multi-User SaaS & Household Data Isolation**
   - Implemented tenant-level household partitioning (`householdId` / `careProfileId`) across all MongoDB queries and in-memory mock stores.
   - Enforced strict IDOR (Insecure Direct Object Reference) protection preventing users in one household from viewing, editing, or deleting medications or health logs belonging to another household.
   - Maintained pre-seeded demo records (`profile_meera_01`) in an isolated demo household so quick persona testing does not leak into live user sessions.

2. **Passwordless Gmail OTP Authentication Engine**
   - Added live 6-digit numeric OTP authentication via Gmail SMTP (`nodemailer`) with automatic fallback to Resend or simulated outbox mode.
   - Built a secure verification pipeline with 5-minute token expiration, a 60-second re-send rate limit, bcrypt OTP hashing, and a 5-attempt brute-force lockout.
   - Implemented automatic user onboarding: new email logins automatically provision a dedicated User account, Household record, and Care Profile.
   - Preserved one-click persona switcher buttons on the login screen for testing the Senior (Meera Sharma), Caregiver (Sunita Verma), and Family Member (Rahul Sharma) flows.

3. **Live SOS Emergency Broadcast & Action Modal**
   - Upgraded the Senior Care Mode "I NEED HELP" hero button to trigger an immediate, high-priority emergency broadcast (`/api/emergency/trigger`).
   - Dispatches emergency alert emails to all active care circle members with the senior's medical profile, allergies, chronic conditions, and direct dashboard links.
   - Opened the interactive `EmergencyActionModal` featuring one-tap emergency call triggers (112, 911, primary caregiver), broadcast delivery status, and audit logging.

4. **Medication Prescription Approval & Reconciliation**
   - Added an approval workflow endpoint (`/api/medications/[id]/approval`) allowing caregivers to propose prescription changes while reserving approval rights strictly for the Elder (Senior) or Household Owner.
   - Enforced rule: caregivers cannot self-approve medications they submit.
   - Tracked prescription lifecycle status: `CONTINUE`, `MODIFIED`, `DISCONTINUED`, and `TAPERED` with audit trails.

5. **Dynamic Care Circle Passcodes & Member Management**
   - Care circle invite codes can now be dynamically generated, refreshed, and copied directly from the Care Circle management view.
   - Added member removal actions (`/api/care-profiles/members/[id]`) and secure join handling via bcrypt verification.

6. **Email Delivery Hub & Scheduler Outbox**
   - Built an interactive `EmailDeliveryHub` component into the Care Circle and Settings views.
   - Enables real-time verification email testing (`/api/notifications/test-email`), manual triggering of the overdue dose reminder daemon (`/api/cron/reminders`), and visual inspection of sent email history.

7. **Sticky Navigation & Responsive Viewport Overhaul**
   - Redesigned the navigation layout with pinned, non-scrolling top headers and sidebars.
   - Added responsive drawer navigation for mobile viewports, high-contrast touch targets, and a sticky persona switcher.

8. **Expanded Test Suite (40/40 Passing)**
   - Expanded automated test coverage from 31 to 40 passing unit and integration tests across 6 suites, including multi-tenant isolation and brute-force OTP tests.
   - Verified the 21-step end-to-end operational test pipeline (`scripts/test-e2e.mjs`).

9. **UI/UX Overhaul & Professional AI Doctor Report Redesign**
   - **Care Circle Emergency Contact Fix**: Restructured emergency contact directory with CSS Grid. Desktop/tablet renders 2 columns; mobile stacks vertically with full-width action buttons. Contact info and phone buttons now possess independent layout space, preventing text overlap, label collapse, or button clipping with clickable `tel:` links and `[overflow-wrap:anywhere]`.
   - **AI Doctor Report Document Redesign**: Eliminated raw Gemini JSON output entirely. Redesigned `/reports` into a hospital-grade, doctor-ready consultation briefing sheet featuring 9 structured sections:
     1. Report Header (CareNest AI branding, Clinical Summary title, generation timestamp, 7-day audit window)
     2. Patient Demographics & Baseline (Full legal name, preferred name, age, gender, blood group, patient ID)
     3. Medical Background (Chronic diagnoses, known drug allergies, primary treating clinician, emergency contacts)
     4. Medication Reconciliation Table (Pill visuals, category, dosage, schedule, meal relations, stock warnings, reconciliation status)
     5. Medication Adherence & Concurrency (Adherence %, total scheduled, taken, missed, skipped, streak, visual trend bar, zero double-dose confirmation)
     6. Symptom & Health Observation Journal (Clinical overview, severity counts, recorded patient episodes, caregiver observations)
     7. AI Clinical Synthesis (Clean Markdown-rendered clinical analysis with pattern insights, zero code fences, zero raw JSON)
     8. Suggested Discussion Points for Attending Physician (3-5 bulleted discussion cards with review checkboxes)
     9. Important Medical Disclaimer & Physician Sign-Off (Non-diagnostic legal notice, clinician signature line, license number, and regimen assessment checkboxes)
     - Added Clean Print Layout (`@media print`) and PDF Download support.
   - **Overview Health Check-in Widget Fix**: Rebuilt `SymptomLogger` responsive grid. In 1-column dashboard widget, cards render as a clean 2-column grid instead of collapsing into 4 squeezed columns. Senior Mode provides 84px+ touch targets with natural text wrapping.
   - **Login Page Polish**: Subtle 15-20% UI elevation with soft light teal radial atmosphere, refined card shadows, input focus ring, disabled loading states with spinner on OTP button, and equal-height elevated demo personas.

---

## Core Features and How They Work

### 1. Senior Care Mode (Accessibility-First Interface)
Designed specifically for seniors with visual, cognitive, or motor impairments.

- **Target User**: Elderly seniors (e.g., Meera Sharma, age 72).
- **How It Works**:
  1. When Senior Mode is active, the interface switches to large typography, high-contrast cards, and oversized touch targets (`min-h-[140px]`).
  2. The home screen centers around three primary hero buttons:
     - **I Have Taken My Medicine**: Opens the upcoming dose checklist with 1-tap confirmation.
     - **I Need Help (SOS)**: Triggers an immediate emergency broadcast across the care circle.
     - **How Am I Feeling?**: Launches a 1-tap symptom check-in screen.
  3. Integrated Web Speech API (`SpeechSynthesis`) reads dose instructions out loud at a calibrated 0.88x speed for auditory clarity.
  4. Complex administrative controls (prescription editing, billing, audit exports) are hidden to prevent accidental reconfiguration.

### 2. Concurrency-Safe Anti-Double-Dosing Engine
Prevents accidental duplicate doses when multiple caregivers are active or when an elderly patient double-taps the administration button.

- **Target User**: Seniors, Caregivers, and Family Members.
- **How It Works**:
  1. Each dose has a deterministic composite unique key: `doseKey = ${medicationId}_${scheduledDate}_${timeSlot}`.
  2. Administration requests (`POST /api/doses/administer`) execute a MongoDB atomic conditional query (`findOneAndUpdate`):
     - Condition: `{ doseKey, status: 'scheduled' }`
     - Mutation: `{ $set: { status: 'taken', administeredAt: now, administeredBy: userId } }`
  3. If another request attempts to mark the same doseKey, the condition fails. The endpoint returns an **HTTP 409 Conflict** with details on who took the dose and at what exact time.
  4. On successful administration, medication stock is atomically decremented (`$inc: { remainingQuantity: -1 }`). If inventory falls below the refill threshold, an automatic notification and warning email are dispatched.

### 3. Multi-User SaaS & Household Tenancy Isolation
Supports multiple separate families and care circles on the same platform without data leakage.

- **Target User**: All registered users and households.
- **How It Works**:
  1. Each senior or family profile is anchored to a unique `householdId`.
  2. Every database query on `medications`, `doseEvents`, `healthLogs`, `caregiverNotes`, and `notifications` strictly filters by `{ householdId }`.
  3. If a user attempts to access a resource with a foreign `householdId`, the API immediately rejects the request with an **HTTP 403 Forbidden** error (IDOR protection).
  4. Pre-seeded demo accounts run inside a dedicated demo household, allowing prospective users to evaluate the platform without altering real patient data.

### 4. Dual Authentication: Passwordless Gmail OTP & Demo Personas
Flexible authentication accommodating real production access and rapid evaluation.

- **Target User**: All users.
- **How It Works**:
  - **Live Gmail OTP Flow**:
    1. User enters their email address at `/login` or `/verify-otp`.
    2. The server generates a cryptographically secure 6-digit random integer (`crypto.randomInt(100000, 1000000)`).
    3. The OTP is hashed with bcrypt and saved to the `otpVerifications` collection with a 5-minute expiration timestamp and a 60-second re-send rate limit.
    4. The OTP is delivered via Gmail SMTP (`nodemailer`) or Resend.
    5. The user enters the code; on successful verification, a signed HTTP-only session cookie is set. If the user is new, a Household and Care Profile are automatically created.
    6. To protect against brute force attacks, entering 5 incorrect codes permanently locks and invalidates that OTP session.
  - **1-Click Demo Persona Flow**:
    1. The login screen provides quick-access buttons for pre-configured personas:
       - **Senior**: Meera Sharma (Role: `SENIOR`)
       - **Caregiver**: Sunita Verma (Role: `CAREGIVER`)
       - **Family Member**: Rahul Sharma (Role: `FAMILY`)
    2. Clicking a persona resolves a session token directly without requiring email entry, speeding up evaluation and demonstration.

### 5. Live SOS Emergency Broadcast & Rapid Action Modal
Provides instant assistance when an elderly patient feels unwell or encounters an emergency.

- **Target User**: Seniors and Caregivers.
- **How It Works**:
  1. The senior taps "I NEED HELP" from the main dashboard.
  2. The application opens `EmergencyActionModal` and dispatches `POST /api/emergency/trigger`.
  3. The backend retrieves all registered care circle members (caregivers, family members) and sends an urgent email notification detailing the senior's name, timestamp, listed allergies, and chronic conditions.
  4. The modal presents direct dial triggers for local emergency services (112, 911) and the primary caregiver's phone number.
  5. An urgent priority entry is written to the `notifications` collection and logged in the immutable `auditLogs` collection.

### 6. Role-Based Access Control (RBAC) & Care Circle Management
Governs system permissions according to the user's relationship with the patient.

- **Target User**: Seniors, Caregivers, and Family Members.
- **How It Works**:
  1. Care circle relationships are stored in the `careMemberships` collection with defined roles:
     - **Senior**: Manages personal dose check-ins, symptom reports, and SOS help. Restricted from deleting medications or viewing internal caregiver shift notes.
     - **Caregiver**: Administers doses, creates medication entries, logs shift handoff notes, and manages inventory.
     - **Family Member**: Read-only oversight on dose adherence, upcoming appointments, and caregiver logs. Restricted from administering doses.
     - **Household Owner**: Full administrative control, including medication approvals and member removal.
  2. Each care circle possesses an invite passcode (e.g., `NEST72` or dynamic code). New members must enter this passcode to join a circle.

### 7. Medication Cabinet & Meal Timing Visualizer
Organizes multi-category prescriptions and visual aids for daily adherence.

- **Target User**: Caregivers and Seniors.
- **How It Works**:
  1. Supports four medication categories: **Allopathic**, **Ayurvedic**, **Herbal**, and **Over-The-Counter (OTC)**.
  2. Medication records define dosage, unit (Tablet, Capsule, Syrup, Drops), color, and physical shape (Round, Oval, Capsule, Hexagon).
  3. Schedule timing is tied directly to meal relations:
     - `before_meal`: 30 minutes before eating.
     - `after_meal`: Post-meal consumption.
     - `with_meal`: Taken during meals.
     - `empty_stomach`: First thing in the morning.
     - `anytime`: Flexible intake.
  4. Real-time inventory tracking calculates remaining days based on daily dose frequency and alerts the care circle before supplies run out.

### 8. Prescription Approval & Reconciliation Workflow
Maintains a clinical audit trail for changes to an elderly patient's medication regimen.

- **Target User**: Caregivers and Household Owners / Seniors.
- **How It Works**:
  1. When a caregiver adds or modifies a medication, it can be marked as `pending_approval`.
  2. The senior or household owner reviews the entry via `/api/medications/[id]/approval`. Caregivers cannot approve their own submissions.
  3. Medications are categorized under clinical reconciliation statuses:
     - `CONTINUE`: Active without change.
     - `MODIFIED`: Dosage or timing adjusted.
     - `DISCONTINUED`: Treatment concluded.
     - `TAPERED`: Gradual dose reduction schedule.
  4. All decisions generate an audit trail entry and alert notification.

### 9. AI Clinical Doctor Summary & Medicine Explanations
Utilizes Google Gemini 3.5 Flash to summarize health trends and clarify medical instructions.

- **Target User**: Caregivers, Family Members, and Attending Physicians.
- **How It Works**:
  - **Clinical Doctor Summary (`/reports`)**:
    1. Aggregates past dose adherence rates, recorded missed doses, logged symptoms, active prescriptions, and vitals.
    2. Sends the compiled record to the Gemini API (`gemini-3.5-flash`).
    3. Generates a concise, 1-page clinical summary featuring an adherence score, symptom analysis, and 3 to 5 targeted discussion questions for the patient's next doctor visit.
    4. Includes a print-friendly CSS stylesheet for producing physical clinical handouts.
  - **Plain-Language Explanations (`/api/ai/explain`)**:
    1. Converts complex pharmacological instructions into simple, compassionate language for seniors.
    2. Feeds output directly into the Web Speech TTS engine for audio playback.
  - **Deterministic Fallback Engine**:
    - If `GEMINI_API_KEY` is not configured or network degradation occurs, a built-in deterministic algorithm computes exact adherence percentages, flags recent symptoms, and produces clinical questions without crashing or throwing errors.

### 10. Staged Reminder Escalation Daemon
Progressive three-stage alert ladder ensuring overdue doses are not missed.

- **Target User**: Seniors and Caregivers.
- **How It Works**:
  1. The protected background endpoint `/api/cron/reminders` runs periodically (validated via `CRON_SECRET` header or bearer token).
  2. Queries all doses scheduled for the current day where `status === 'scheduled'` and compares against current time:
     - **Stage 1 (0 to 15 minutes overdue)**: Triggers an in-app visual reminder on the senior's dashboard.
     - **Stage 2 (15 to 30 minutes overdue)**: Promotes notification to high-priority circle alert across all caregiver feeds.
     - **Stage 3 (30+ minutes overdue)**: Dispatches an urgent escalation email to all registered caregivers containing dose details and emergency contact options.
  3. Logs all escalation actions in the database to prevent duplicate notifications during subsequent cron cycles.

### 11. Email Delivery Hub & Outbox Inspector
Live operational control for testing and verifying notification pipelines.

- **Target User**: Caregivers, Family Members, and System Administrators.
- **How It Works**:
  1. Located directly in the Care Circle and Settings screens (`EmailDeliveryHub.tsx`).
  2. Features an active connection pill displaying the active email provider:
     - `Gmail SMTP (Live)` when Gmail credentials are provided.
     - `Resend API (Live)` when Resend is configured.
     - `Live Outbox (Safe Mock)` when running in zero-setup development mode.
  3. Provides a "Send Live Test Email" form to verify SMTP delivery to any arbitrary address.
  4. Features a "Run Scheduler Daemon Now" button allowing manual execution and inspection of the reminder escalation ladder.
  5. Displays recent email notifications with status tags, recipient lists, and message IDs.

### 12. Health Journal & 1-Tap Symptom Check-Ins
Enables effortless reporting of post-medication side effects.

- **Target User**: Seniors and Caregivers.
- **How It Works**:
  1. Seniors select from common physical symptoms (Dizziness, Fatigue, Nausea, Confusion, Headache, Chest Tightness, Drowsiness, Stomach Discomfort).
  2. Users select severity: `Mild`, `Moderate`, or `Severe`.
  3. Moderate and Severe reports immediately generate high-priority notifications for the care circle.
  4. All entries are stored in `healthLogs` and automatically included in the next generated AI Doctor Summary.

---

## Technical Architecture

```
                     +---------------------------------------+
                     |         Browser UI (Next.js 15)       |
                     |  - Senior Mode (TTS / Giant Targets)  |
                     |  - Caregiver Dashboard (Doses & CRUD) |
                     |  - Family Analytics (7-Day Adherence) |
                     |  - Email Delivery Hub & Outbox        |
                     +-------------------+-------------------+
                                         |
                       HTTP / REST API (Route Handlers)
                                         |
                     +-------------------v-------------------+
                     |       Next.js API & Auth Layer        |
                     |  - Session Verification / Bcrypt      |
                     |  - RBAC & Household Tenancy Guard     |
                     |  - Zod Request Schema Validation      |
                     +---+-------------------+---------------+
                         |                   |
            +------------+                   +------------+
            |                                             |
+-----------v-----------+                     +-----------v-----------+
|      Persistence      |                     |   External Services   |
| - MongoDB Atlas       |                     | - Google Gemini 3.5   |
|   (Households, Doses, |                     |   (Clinical Summaries)|
|   Medications, Logs)  |                     | - Gmail SMTP / Resend |
| - In-Memory Fallback  |                     |   (OTP & SOS Emails)  |
| - Atomic Locking Lock |                     | - Web Speech TTS API  |
+-----------------------+                     +-----------------------+
```

### Technology Stack

| Layer | Component | Details |
| :--- | :--- | :--- |
| **Framework** | Next.js 15.1.7 | App Router, Server-Side Route Handlers, React Server Components |
| **Frontend** | React 19, TypeScript | Tailwind CSS 3.4, Lucide React icons, Web Speech Synthesis API |
| **Database** | MongoDB Atlas / In-Memory | Official Node driver (`mongodb` v6.13) with zero-config mock fallback |
| **Authentication** | Passwordless OTP & JWT | Bcryptjs password & token hashing, HTTP-only session cookies |
| **AI Summaries** | Google Gemini 3.5 Flash | `@google/generative-ai` with deterministic fallback generator |
| **Email Transporter** | Gmail SMTP / Resend | `nodemailer` (Gmail App Password) + `resend` v4.1 fallback |
| **Containerization** | Docker | Multi-stage build with standalone Next.js server output |

---

## Database Collections & Schemas

The application organizes data across 12 MongoDB collections, all scoped by `householdId` where applicable:

| Collection | Primary Fields | Description |
| :--- | :--- | :--- |
| `users` | `_id`, `email`, `fullName`, `role`, `createdAt` | Registered user credentials and profiles. |
| `households` | `_id`, `name`, `ownerUserId`, `createdAt` | Tenant partition grouping family care units. |
| `memberships` | `_id`, `householdId`, `userId`, `role`, `status` | Links users to specific households with defined roles. |
| `careProfiles` | `_id`, `householdId`, `fullName`, `age`, `allergies`, `conditions`, `inviteCode` | Senior patient medical history and contact data. |
| `careMemberships`| `_id`, `careProfileId`, `userId`, `role`, `status` | Care circle association records. |
| `medications` | `_id`, `householdId`, `medicineName`, `dosage`, `schedule`, `stock`, `status` | Prescription cabinet and refill thresholds. |
| `doseEvents` | `_id`, `householdId`, `doseKey` (unique), `scheduledAt`, `status`, `administeredBy` | Concurrency-safe dose administration records. |
| `appointments` | `_id`, `householdId`, `doctorName`, `specialty`, `dateTime`, `location` | Scheduled medical visits and clinic details. |
| `healthLogs` | `_id`, `householdId`, `symptom`, `severity`, `reportedBy`, `reportedAt` | Symptom reports and daily vitals logs. |
| `caregiverNotes`| `_id`, `householdId`, `authorName`, `shiftDate`, `noteContent` | Shift handoff summaries between caregivers. |
| `notifications` | `_id`, `householdId`, `title`, `message`, `priority`, `stage`, `status` | In-app alerts, reminder escalations, and outbox logs. |
| `auditLogs` | `_id`, `householdId`, `actorId`, `actorName`, `action`, `details`, `timestamp` | Tamper-evident clinical compliance log. |
| `otpVerifications`| `_id`, `email`, `hashedOtp`, `attempts`, `expiresAt`, `resendAvailableAt` | Rate-limited passwordless authentication records. |

---

## Role-Based Access Control (RBAC) Matrix

| Feature / Action | Senior (`SENIOR`) | Primary Caregiver (`CAREGIVER`) | Family (`FAMILY`) | Owner (`OWNER`) |
| :--- | :---: | :---: | :---: | :---: |
| Access Senior Care Mode | Yes | Yes | Yes | Yes |
| Voice Reader TTS Playback | Yes | Yes | Yes | Yes |
| Mark Dose Taken (Administer) | Yes | Yes | Read Only (403) | Yes |
| Trigger Emergency SOS | Yes | Yes | Yes | Yes |
| Log Symptoms & Vitals | Yes | Yes | Yes | Yes |
| Add / Edit Medication | Restricted (403) | Yes | Read Only (403) | Yes |
| Approve Medication Changes | Yes | Restricted (403) | Read Only (403) | Yes |
| Add Shift Handoff Notes | Restricted (403) | Yes | Read Only (403) | Yes |
| View Adherence Analytics | Simplified | Yes | Yes | Yes |
| Generate AI Doctor Summary | Yes | Yes | Yes | Yes |
| Manage Care Circle Members | Restricted (403) | Restricted (403) | Restricted (403) | Yes |

---

## Quickstart & Local Setup

### 1. Prerequisites
- Node.js >= 20.x (Recommended: v20 or v22)
- npm >= 10.x

### 2. Clone and Install Dependencies
```bash
git clone <repo-url>
cd carenest-ai
npm install
```

### 3. Environment Configuration
Create a `.env.local` file in the project root:
```bash
cp .env.example .env.local
```

Populate the required environment variables:
```env
# MongoDB Atlas (Leave empty to use zero-config in-memory mock store)
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/carenest?retryWrites=true&w=majority
MONGODB_DB=carenest

# Gmail SMTP for Live OTP & Alert Emails
# Generate a 16-character App Password at: https://myaccount.google.com/apppasswords
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-char-app-password

# Google Gemini API (For AI Doctor Summaries and Explanations)
GEMINI_API_KEY=your-gemini-api-key

# Resend API (Secondary/Fallback Email Provider)
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=onboarding@resend.dev

# Scheduler Secret (Protects /api/cron/reminders daemon endpoint)
CRON_SECRET=carenest-secret-cron-token-2026

# App Base URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **Zero-Configuration Fallback**: If `MONGODB_URI`, `GEMINI_API_KEY`, or `GMAIL_APP_PASSWORD` are not provided, CareNest AI will automatically fall back to its internal in-memory mock store, deterministic summary generator, and simulated email outbox. The application will start and run without external dependencies.

### 4. Seed Initial Data
To populate sample records for Meera Sharma (Senior), Sunita Verma (Caregiver), and Rahul Sharma (Family):
```bash
npm run seed
```

### 5. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## Testing & Quality Assurance

CareNest AI includes an automated test harness validating concurrent locking, role boundaries, email delivery, AI fallbacks, and multi-tenant isolation.

### 1. Run Automated Unit Test Suites
```bash
npm test
```

Executes all 40 tests across 6 specialized suites:

```
▶ Concurrency-Safe Atomic Dose Administration & Anti-Double-Dosing Suite (6 tests)
  - Atomic dose administration and stock decrement
  - Sequential duplicate doseKey yields HTTP 409 Conflict
  - 5x concurrent race condition yields exactly 1 success and 4 conflicts
  - Refill notification triggered at low inventory threshold
  - Tamper-evident audit logging verification

▶ Gemini Doctor Summary & Deterministic Fallback Suite (5 tests)
  - Graceful execution when GEMINI_API_KEY is missing
  - Deterministic clinical fallback generation
  - Structured output validation for /api/ai/doctor-summary
  - Plain-language medication explanations

▶ CareNest Multi-User SaaS Isolation & Gmail OTP Suite (8 tests)
  - 60-second OTP re-send cooldown enforcement
  - Rejection of bad OTPs, expired tokens, and 5-attempt brute-force lockout
  - Automatic provisioning of independent household and profile per user
  - Strict tenant data isolation between User A and User B
  - IDOR protection across cross-household medication endpoints
  - Session invalidation on logout

▶ RBAC Authorization & Care Circle Isolation Suite (5 tests)
  - Caregiver administrative privileges
  - Senior role restriction enforcement (HTTP 403)
  - Family Member read-only constraints (HTTP 403)
  - Cross-circle isolation preventing unauthorized patient access
  - Dynamic invite passcode verification

▶ Resend Email Client & Reminder Escalation Suite (5 tests)
  - Safe simulated outbox fallback when keys are absent
  - Stage 3 caregiver emergency email formatting
  - Low inventory alert template rendering
  - CRON_SECRET security validation (HTTP 401 on unauthorized calls)
  - Reminder escalation ladder execution

▶ Senior Care Mode Accessibility & TTS Voice Fallback Suite (5 tests)
  - Verification of 3 primary action hero buttons
  - Giant touch targets and high-contrast ARIA elements
  - Web Speech API speech rate calibration (0.88x)
  - DoubleDoseWarningModal clinical guidance accessibility
```

### 2. Run End-to-End Operational Pipeline
```bash
npm run test:e2e
```
Executes a 21-step operational test sequence covering user logins, circle joins, prescription creation, atomic double-dose prevention, emergency broadcasts, and RBAC safety checks.

### 3. Verify Live External Services
```bash
npm run test:live
```
Tests live connections to MongoDB Atlas, Google Gemini API (`gemini-3.5-flash`), and Gmail SMTP.

---

## Production Build & Container Deployment

### 1. Build Production Bundle Locally
```bash
npm run build
npm run start
```

### 2. Docker Containerization
The repository includes a multi-stage `Dockerfile` producing a standalone Next.js server container:

```bash
# Build the Docker image
docker build -t carenest-ai:latest .

# Run the container locally
docker run -p 8080:8080 --env-file .env.local carenest-ai:latest
```

### 3. Google Cloud Run Deployment
Deploy directly to Google Cloud Run (e.g., `asia-south1` or `us-central1`):

```bash
gcloud run deploy carenest-ai \
  --image gcr.io/[PROJECT_ID]/carenest-ai:latest \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars="NODE_ENV=production,CRON_SECRET=[SECRET],MONGODB_URI=[URI],GEMINI_API_KEY=[KEY],GMAIL_USER=[EMAIL],GMAIL_APP_PASSWORD=[PASS]"
```

### 4. Health Check Endpoint
The running service exposes a container health check:
```bash
curl http://localhost:8080/api/health
```
Response:
```json
{
  "status": "healthy",
  "service": "carenest-ai",
  "version": "0.1.0"
}
```

---

## License

This project was built for the MNM Hackathon. Distributed under the MIT License.
