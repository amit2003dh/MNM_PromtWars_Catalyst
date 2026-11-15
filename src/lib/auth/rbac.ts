import { CareMemberRole, UserRole, CareMembership } from '@/types';
import { getCareMembershipsCollection } from '@/lib/db';

export interface MembershipVerification {
  isMember: boolean;
  role?: CareMemberRole;
  membership?: CareMembership;
}

/**
 * Checks if a user is an active member of a specific Care Profile circle.
 */
export async function verifyMembership(
  userId: string,
  careProfileId: string
): Promise<MembershipVerification> {
  if (!userId || !careProfileId) {
    return { isMember: false };
  }

  try {
    const membershipsCol = await getCareMembershipsCollection();
    const membership = await membershipsCol.findOne({
      userId,
      careProfileId,
      status: 'active',
    });

    if (!membership) {
      return { isMember: false };
    }

    return {
      isMember: true,
      role: membership.role as CareMemberRole,
      membership,
    };
  } catch (err) {
    console.error('[RBAC] Error verifying membership:', err);
    return { isMember: false };
  }
}

/**
 * Checks whether a given role can administer / mark doses.
 * Senior (personal) and Caregiver / Primary Caregiver (administered) are authorized.
 * Family members are read-only to prevent accidental dose marking.
 */
export function canAdministerDose(role?: CareMemberRole | UserRole | string): boolean {
  if (!role) return false;
  return ['senior', 'caregiver', 'primary_caregiver'].includes(role);
}

/**
 * Checks whether a role can create or modify medications.
 * Only Caregiver and Primary Caregiver can add or modify prescription details.
 */
export function canManageMedications(role?: CareMemberRole | UserRole | string): boolean {
  if (!role) return false;
  return ['caregiver', 'primary_caregiver'].includes(role);
}

/**
 * Checks whether a role can write caregiver shift handoff notes.
 */
export function canWriteCaregiverNotes(role?: CareMemberRole | UserRole | string): boolean {
  if (!role) return false;
  return ['caregiver', 'primary_caregiver'].includes(role);
}

/**
 * Checks whether a role can submit health/symptom logs.
 * Seniors and Caregivers are authorized.
 */
export function canReportSymptoms(role?: CareMemberRole | UserRole | string): boolean {
  if (!role) return false;
  return ['senior', 'caregiver', 'primary_caregiver'].includes(role);
}

/**
 * Checks whether a role can schedule or modify doctor appointments.
 * Caregivers and Family members are authorized.
 */
export function canManageAppointments(role?: CareMemberRole | UserRole | string): boolean {
  if (!role) return false;
  return ['caregiver', 'primary_caregiver', 'family'].includes(role);
}
