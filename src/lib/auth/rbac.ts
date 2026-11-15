import { CareMemberRole, UserRole, CareMembership, HouseholdRole } from '@/types';
import { getCareMembershipsCollection, getMembershipsCollection } from '@/lib/db';

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
 * Verifies household membership directly from memberships collection.
 */
export async function verifyHouseholdMembership(
  userId: string,
  householdId: string
): Promise<{ isMember: boolean; role?: HouseholdRole }> {
  if (!userId || !householdId) {
    return { isMember: false };
  }

  try {
    const memCol = await getMembershipsCollection();
    const membership = await memCol.findOne({
      userId,
      householdId,
      status: 'active',
    });

    if (!membership) {
      return { isMember: false };
    }

    return {
      isMember: true,
      role: membership.role as HouseholdRole,
    };
  } catch (err) {
    console.error('[RBAC] Error verifying household membership:', err);
    return { isMember: false };
  }
}

/**
 * Checks whether a given role can administer / mark doses.
 * OWNER, CAREGIVER, Primary Caregiver, and Senior (personal) are authorized.
 * Family members / coordinators are read-only for dose administration to prevent accidental clicks.
 */
export function canAdministerDose(role?: HouseholdRole | CareMemberRole | UserRole | string): boolean {
  if (!role) return false;
  const normalized = role.toUpperCase();
  return ['OWNER', 'CAREGIVER', 'SENIOR', 'PRIMARY_CAREGIVER'].includes(normalized);
}

/**
 * Checks whether a role can create or modify medications.
 * OWNER, FAMILY_COORDINATOR, and CAREGIVER are authorized.
 * Seniors cannot modify prescriptions.
 */
export function canManageMedications(role?: HouseholdRole | CareMemberRole | UserRole | string): boolean {
  if (!role) return false;
  const normalized = role.toUpperCase();
  return ['OWNER', 'FAMILY_COORDINATOR', 'CAREGIVER', 'PRIMARY_CAREGIVER'].includes(normalized);
}

/**
 * Checks whether a role can write caregiver shift handoff notes.
 */
export function canWriteCaregiverNotes(role?: HouseholdRole | CareMemberRole | UserRole | string): boolean {
  if (!role) return false;
  const normalized = role.toUpperCase();
  return ['OWNER', 'CAREGIVER', 'PRIMARY_CAREGIVER', 'FAMILY_COORDINATOR'].includes(normalized);
}

/**
 * Checks whether a role can submit health/symptom logs.
 * Seniors, Caregivers, and Owners are authorized.
 */
export function canReportSymptoms(role?: HouseholdRole | CareMemberRole | UserRole | string): boolean {
  if (!role) return false;
  const normalized = role.toUpperCase();
  return ['OWNER', 'SENIOR', 'CAREGIVER', 'PRIMARY_CAREGIVER'].includes(normalized);
}

/**
 * Checks whether a role can schedule or modify doctor appointments.
 */
export function canManageAppointments(role?: HouseholdRole | CareMemberRole | UserRole | string): boolean {
  if (!role) return false;
  const normalized = role.toUpperCase();
  return ['OWNER', 'FAMILY_COORDINATOR', 'CAREGIVER', 'PRIMARY_CAREGIVER', 'FAMILY'].includes(normalized);
}

/**
 * Checks whether a role has full household administrative management.
 */
export function canManageHousehold(role?: HouseholdRole | CareMemberRole | UserRole | string): boolean {
  if (!role) return false;
  const normalized = role.toUpperCase();
  return ['OWNER'].includes(normalized);
}
