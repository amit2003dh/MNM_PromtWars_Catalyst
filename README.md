# CareNest AI — Intelligent Elderly Care & Medication Management Ecosystem

> Senior-centric collaborative healthcare platform ensuring safe medication administration, anti-double-dosing locking, AI-powered doctor summaries, and shared care circle coordination.

---

## 🌟 Key Innovations & Features

1. **Senior Care Mode**
   - High-contrast, extra-large typography, and giant touch targets.
   - Text-to-Speech (TTS) voice instructions using Browser SpeechSynthesis API.
   - One-tap symptom logging (Dizziness, Weakness, Confusion, Stomach Discomfort, Feeling Fine).
   - "I Have Taken My Medicine" & "I Need Help" quick emergency/assistance buttons.

2. **Atomic Anti-Double-Dosing Lock (Concurrency-Safe)**
   - Utilizes MongoDB atomic conditional updates (`findOneAndUpdate` / unique `doseKey` constraints) preventing duplicate administration even under simultaneous multi-caregiver requests or browser refreshes.
   - Immutable audit trail recording exactly who administered each dose and when.

3. **Multi-Role Care Circle Architecture**
   - **Senior**: High-accessibility view of today's doses, voice assistance, and instant symptom logging.
   - **Caregiver**: Real-time medication administration, shift handoff notes, inventory refill monitoring, and side-effect alerts.
   - **Family Member**: Remote adherence analytics, caregiver activity history, and upcoming appointments.

4. **Medication & Inventory Management**
   - Support for Allopathic, Ayurvedic, Herbal, and OTC medications.
   - Granular meal timings (`before_meal`, `after_meal`, `with_meal`, `empty_stomach`, `anytime`).
   - Dynamic inventory deduction with automated low-stock refill threshold alerts.

5. **AI Doctor-Ready Summaries & Medication Explanation (Gemini 2.5 / Flash)**
   - Plain-language patient medication explanations.
   - One-click print-ready clinical summaries aggregating verified adherence, missed doses, side effects, and active prescriptions.
   - Deterministic template fallback when Gemini API credentials are absent or network is degraded.

6. **Refill & Missed Dose Escalation Engine**
   - Staged alert escalation: Stage 1 (Senior in-app reminder) -> Stage 2 (+15m gentle prompt) -> Stage 3 (+30m Caregiver alert via Resend email / push).
   - Protected cron-triggered webhook endpoint for reliable scheduling.

---

## 🛠️ Technology Stack

- **Framework**: Next.js 15 (App Router, Server Actions, Route Handlers)
- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide React
- **Database**: MongoDB Atlas with official Node.js Driver & connection pooling
- **Authentication**: Supabase Auth (`@supabase/ssr`) with Role-Based Authorization
- **AI & Summaries**: Google Gemini API (`@google/generative-ai`)
- **Email Delivery**: Resend API with graceful offline fallback
- **Deployment**: Google Cloud Run / Docker containerized production build

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js >= 20.x
- MongoDB Atlas database URI
- (Optional) Supabase project credentials
- (Optional) Gemini API Key & Resend API Key

### 2. Environment Setup
Copy the example environment configuration:
```bash
cp .env.example .env.local
```
Fill in your credentials or test with local deterministic fallbacks.

### 3. Installation & Run
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

### 4. Deterministic Demo Seed Data
Populate realistic demo records for **Meera Sharma** (Senior), **Sunita** (Caregiver), and **Rahul** (Family Member):
```bash
npm run seed
```
