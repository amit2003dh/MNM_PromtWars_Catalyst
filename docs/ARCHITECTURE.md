# CareNest AI — Technical Architecture & Integration Contracts

## 1. High-Level Architecture

CareNest AI is an integrated, full-stack Next.js 15 application utilizing the App Router architecture, unified RESTful Route Handlers, MongoDB Atlas for persistent operational healthcare state, Supabase Auth for multi-role session verification, and Google Gemini API for clinical summarization.

```
+-------------------------------------------------------------------+
|                        CareNest Web Client                        |
|                                                                   |
|  +--------------------+  +--------------------+  +--------------+ |
|  | Senior Care Mode   |  | Caregiver Portal   |  | Family Hub   | |
|  | - Giant Touch UI   |  | - Dose Admin       |  | - Adherence  | |
|  | - Web Speech TTS   |  | - Shift Notes      |  | - Care Logs  | |
|  | - Symptom Buttons  |  | - Inventory Refill |  | - Alerts     | |
|  +--------------------+  +--------------------+  +--------------+ |
+---------------------------------+---------------------------------+
                                  | HTTP / REST API (Zod Validated)
                                  v
+-------------------------------------------------------------------+
|               Next.js Route Handlers (Server-Side)                |
|                                                                   |
|  +--------------------+  +--------------------+  +--------------+ |
|  | /api/auth/*        |  | /api/medications   |  | /api/doses/* | |
|  | - Supabase Verify  |  | - CRUD Operations  |  | - Anti-Double| |
|  | - Role & Circle    |  | - Inventory Adjust |  |   Dose Lock  | |
|  +--------------------+  +--------------------+  +--------------+ |
|  | /api/appointments  |  | /api/health-logs   |  | /api/reports | |
|  | - Scheduling       |  | - Symptom Log      |  | - Gemini AI  | |
|  | - Doctor Details   |  | - Escalation Alert |  | - Fallback   | |
|  +--------------------+  +--------------------+  +--------------+ |
+--------------------+---------------------+------------------------+
                     |                     |
         +-----------v----------+   +------v----------------+
         |    MongoDB Atlas     |   | Google Gemini API     |
         | - Atomic Conditions  |   | - Plain Medication Exp|
         | - Unified Collections|   | - Clinical Summaries  |
         | - Indexed Queries    |   +-----------------------+
         +----------------------+
```

## 2. Anti-Double-Dosing Locking Protocol

Double-dosing is one of the highest clinical risks in elderly care.
CareNest AI guarantees strict concurrency-safe dose administration:

1. **Unique Dose Key Generation**:
   `doseKey = ${careProfileId}_${medicationId}_${YYYY-MM-DD}_${HH:mm}`
2. **Atomic Execution in MongoDB**:
   ```typescript
   const result = await db.collection('doseEvents').findOneAndUpdate(
     {
       doseKey: doseKey,
       status: 'scheduled'
     },
     {
       $set: {
         status: 'taken',
         administeredBy: userId,
         administeredByName: userName,
         recordedAt: new Date().toISOString(),
         notes: notes || ''
       }
     },
     { returnDocument: 'after' }
   );
   ```
3. If no document was modified, the API queries whether the dose has already been taken:
   - If already taken: returns HTTP 409 Conflict with details on who administered it and when.
   - If dose was not scheduled: creates it with unique index or returns validation error.
4. Decrements `medications.remainingQuantity` atomically with `$inc: { remainingQuantity: -1 }`.

## 3. Role-Based Access Control (RBAC) Matrix

| Resource | Senior | Caregiver | Family Member |
| :--- | :--- | :--- | :--- |
| View Today Schedule | Yes | Yes | Yes |
| Voice Mode Instructions | Yes | Yes | Yes |
| Mark Dose Taken | Yes (Personal) | Yes (Administered) | No (Read-Only) |
| Report Symptoms | Yes | Yes | No |
| Add / Modify Medications | No | Yes | No |
| Shift Handoff Notes | No | Yes | Read Only |
| Adherence Analytics | Read Only | Yes | Yes |
| Manage Appointments | Read Only | Yes | Yes |
| Generate Doctor Summary | Read Only | Yes | Yes |

## 4. API Endpoints

- `GET /api/care-profiles`: List or get active care profile
- `POST /api/care-profiles/join`: Join care circle with invite passcode
- `GET /api/medications`: Retrieve all active medications
- `POST /api/medications`: Create new medication with inventory count
- `PUT /api/medications/:id`: Update medication details / reconciliation
- `DELETE /api/medications/:id`: Discontinue medication
- `GET /api/doses/today`: Retrieve today's schedule and dose event statuses
- `POST /api/doses/administer`: Atomically administer dose (Anti-Double-Dosing Lock)
- `POST /api/health-logs`: Submit symptom reports (Dizziness, Weakness, etc.)
- `GET /api/health-logs`: Retrieve historical symptom logs
- `GET /api/caregiver-notes`: Retrieve shift handoff notes
- `POST /api/caregiver-notes`: Create shift handoff note
- `GET /api/appointments`: List appointments
- `POST /api/appointments`: Book appointment
- `POST /api/ai/doctor-summary`: Generate printable doctor report with Gemini (or fallback)
- `POST /api/ai/explain-medicine`: Explain medicine instructions in simple language
- `POST /api/cron/reminders`: Background reminder escalation processor
