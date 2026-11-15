export interface Stage3EscalationParams {
  seniorName: string;
  medicineName: string;
  dosage: string;
  category?: string;
  scheduledTime: string;
  minutesOverdue: number;
  instructions?: string;
  caregiverName?: string;
  emergencyPhone?: string;
  dashboardUrl?: string;
}

export function renderStage3EscalationEmail(params: Stage3EscalationParams): { html: string; text: string } {
  const {
    seniorName,
    medicineName,
    dosage,
    category = 'Prescription Medicine',
    scheduledTime,
    minutesOverdue,
    instructions = 'Take as prescribed',
    emergencyPhone,
    dashboardUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  } = params;

  const subject = `🚨 URGENT: Dose Overdue (+${minutesOverdue}m) for ${seniorName} — ${medicineName}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: #dc2626; color: #ffffff; padding: 24px; text-align: center; }
    .header h1 { margin: 0 0 8px 0; font-size: 22px; font-weight: 700; }
    .header p { margin: 0; font-size: 14px; opacity: 0.95; }
    .content { padding: 24px; }
    .alert-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
    .alert-box strong { color: #991b1b; }
    .details-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    .details-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 15px; }
    .details-table td.label { font-weight: 600; color: #64748b; width: 35%; }
    .cta-container { text-align: center; margin: 28px 0; }
    .cta-btn { display: inline-block; background: #0d9488; color: #ffffff; text-decoration: none; padding: 14px 28px; font-size: 16px; font-weight: 600; border-radius: 8px; box-shadow: 0 2px 4px rgba(13, 148, 136, 0.2); }
    .footer { background: #f1f5f9; padding: 16px 24px; font-size: 12px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>CareNest AI — Stage 3 Caregiver Escalation</h1>
      <p>Automated Clinical Safety Alert • Missed Dose Escalation</p>
    </div>
    <div class="content">
      <div class="alert-box">
        <strong>⚠️ Urgent Attention Required:</strong><br>
        A scheduled dose for <strong>${seniorName}</strong> is now <strong>${minutesOverdue} minutes overdue</strong>. Neither the senior nor an on-duty caregiver has marked this dose as taken.
      </div>

      <table class="details-table">
        <tr>
          <td class="label">Patient Name:</td>
          <td><strong>${seniorName}</strong></td>
        </tr>
        <tr>
          <td class="label">Medication:</td>
          <td><strong>${medicineName}</strong> (${dosage})</td>
        </tr>
        <tr>
          <td class="label">Category:</td>
          <td>${category.toUpperCase()}</td>
        </tr>
        <tr>
          <td class="label">Scheduled Time:</td>
          <td>${scheduledTime}</td>
        </tr>
        <tr>
          <td class="label">Status:</td>
          <td><span style="color: #dc2626; font-weight: bold;">OVERDUE (+${minutesOverdue} mins)</span></td>
        </tr>
        <tr>
          <td class="label">Instructions:</td>
          <td>${instructions}</td>
        </tr>
        ${emergencyPhone ? `<tr><td class="label">Emergency Phone:</td><td><a href="tel:${emergencyPhone}">${emergencyPhone}</a></td></tr>` : ''}
      </table>

      <div class="cta-container">
        <a href="${dashboardUrl}" class="cta-btn">Open CareNest to Record or Verify Dose</a>
      </div>

      <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
        <strong>Protocol Reminder:</strong> To prevent accidental double-dosing, please verify with the patient or pillbox prior to logging administration. All actions are atomically locked in CareNest AI.
      </p>
    </div>
    <div class="footer">
      Sent by CareNest AI Escalation Engine • Safe & Concurrency-Protected Eldercare<br>
      © ${new Date().getFullYear()} CareNest AI. All rights reserved.
    </div>
  </div>
</body>
</html>
`.trim();

  const text = `
[CareNest AI — Stage 3 Caregiver Escalation Alert]

URGENT: A scheduled dose for ${seniorName} is ${minutesOverdue} minutes overdue.

Patient: ${seniorName}
Medication: ${medicineName} (${dosage})
Category: ${category}
Scheduled Time: ${scheduledTime}
Status: OVERDUE (+${minutesOverdue} mins)
Instructions: ${instructions}
${emergencyPhone ? `Emergency Phone: ${emergencyPhone}\n` : ''}

Please open CareNest immediately to verify or administer:
${dashboardUrl}

Double-Dosing Prevention: Verify with patient or pill organizer before administering.
`.trim();

  return { html, text };
}

export interface LowInventoryParams {
  seniorName: string;
  medicineName: string;
  remainingQuantity: number;
  refillThreshold: number;
  dashboardUrl?: string;
}

export function renderLowInventoryEmail(params: LowInventoryParams): { html: string; text: string } {
  const {
    seniorName,
    medicineName,
    remainingQuantity,
    refillThreshold,
    dashboardUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  } = params;

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; padding: 20px; background-color: #f8fafc; color: #1e293b;">
  <div style="max-width: 550px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; padding: 24px;">
    <h2 style="color: #b45309; margin-top: 0;">⚠️ Low Medication Inventory Alert</h2>
    <p>This is a notice that <strong>${seniorName}</strong> is running low on <strong>${medicineName}</strong>.</p>
    <ul>
      <li><strong>Current Stock:</strong> ${remainingQuantity} units left</li>
      <li><strong>Refill Threshold:</strong> ${refillThreshold} units</li>
    </ul>
    <p>Please place a refill order soon to prevent interruption in their prescribed care regimen.</p>
    <a href="${dashboardUrl}" style="display: inline-block; background: #0d9488; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px;">Manage Medications in CareNest</a>
  </div>
</body>
</html>
`.trim();

  const text = `
[CareNest AI] Low Inventory Alert for ${seniorName}
Medicine: ${medicineName}
Remaining Stock: ${remainingQuantity} units (Threshold: ${refillThreshold})
Please reorder soon at: ${dashboardUrl}
`.trim();

  return { html, text };
}
