/**
 * Permission utilities for Crowdin-like 4-tier role system
 * 
 * Roles (highest to lowest):
 * - owner: Full control, can delete project
 * - manager: Manage members, settings, all languages
 * - proofreader: Translate + approve for assigned languages (can self-approve)
 * - translator: Translate only for assigned languages
 */

// Permission levels (higher = more access)
export const ROLE_LEVEL = {
  translator: 1,
  proofreader: 2,
  manager: 3,
  owner: 4,
} as const;

export type Role = keyof typeof ROLE_LEVEL;

export interface MemberContext {
  role: Role;
  languages: string[] | null; // null = all languages
  userId: string;
}

/**
 * Parse languages from JSON string stored in DB
 */
export function parseLanguages(languagesJson: string | null): string[] | null {
  if (!languagesJson) return null;
  try {
    const parsed = JSON.parse(languagesJson);
    if (Array.isArray(parsed) && parsed.every(l => typeof l === 'string')) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Serialize languages array to JSON string for DB storage
 */
export function serializeLanguages(languages: string[] | null): string | null {
  if (!languages || languages.length === 0) return null;
  return JSON.stringify(languages);
}

/**
 * Check if a role string is valid
 */
export function isValidRole(role: string): role is Role {
  return role in ROLE_LEVEL;
}

/**
 * Get role level for comparison
 */
export function getRoleLevel(role: string): number {
  if (!isValidRole(role)) return 0;
  return ROLE_LEVEL[role];
}

/**
 * Check if user can translate a specific language
 * - Owner/Manager: Can translate all languages
 * - Proofreader/Translator: Can only translate assigned languages (or all if languages is null)
 */
export function canTranslate(member: MemberContext, language: string): boolean {
  if (getRoleLevel(member.role) >= ROLE_LEVEL.manager) return true;
  if (!member.languages) return true; // null = all languages
  return member.languages.includes(language);
}

/**
 * Check if user can approve translations for a specific language
 * - Owner/Manager: Can approve all languages
 * - Proofreader: Can approve assigned languages (including self-approval)
 * - Translator: Cannot approve
 */
export function canApprove(member: MemberContext, language: string): boolean {
  if (getRoleLevel(member.role) >= ROLE_LEVEL.manager) return true;
  if (member.role !== 'proofreader') return false;
  if (!member.languages) return true; // null = all languages
  return member.languages.includes(language);
}

/**
 * Check if user can manage project members
 * - Owner/Manager: Yes
 * - Others: No
 */
export function canManageMembers(member: MemberContext): boolean {
  return getRoleLevel(member.role) >= ROLE_LEVEL.manager;
}

/**
 * Check if user can update project settings
 * - Owner/Manager: Yes
 * - Others: No
 */
export function canManageSettings(member: MemberContext): boolean {
  return getRoleLevel(member.role) >= ROLE_LEVEL.manager;
}

/**
 * Check if user can delete the project
 * - Owner only
 */
export function canDeleteProject(member: MemberContext): boolean {
  return member.role === 'owner';
}

/**
 * Check if user can assign a specific role to another member
 * - Owner: Can assign any role except owner (only one owner)
 * - Manager: Can assign translator/proofreader
 * - Others: Cannot assign roles
 */
export function canAssignRole(member: MemberContext, targetRole: Role): boolean {
  // Only owner can assign manager role
  if (targetRole === 'manager' && member.role !== 'owner') return false;
  // Cannot assign owner role (owner transfer is a separate operation)
  if (targetRole === 'owner') return false;
  // Must be manager+ to assign any role
  return getRoleLevel(member.role) >= ROLE_LEVEL.manager;
}

/**
 * Get all roles a member can assign
 */
export function getAssignableRoles(member: MemberContext): Role[] {
  if (member.role === 'owner') {
    return ['manager', 'proofreader', 'translator'];
  }
  if (member.role === 'manager') {
    return ['proofreader', 'translator'];
  }
  return [];
}

/**
 * Check if user has any access to the project
 */
export function hasProjectAccess(member: MemberContext): boolean {
  return getRoleLevel(member.role) >= ROLE_LEVEL.translator;
}

/**
 * Get permission summary for UI display
 */
export function getPermissionSummary(role: Role): {
  canTranslate: boolean;
  canApprove: boolean;
  canManageMembers: boolean;
  canDeleteProject: boolean;
  languageRestricted: boolean;
} {
  const level = ROLE_LEVEL[role];
  return {
    canTranslate: level >= ROLE_LEVEL.translator,
    canApprove: level >= ROLE_LEVEL.proofreader,
    canManageMembers: level >= ROLE_LEVEL.manager,
    canDeleteProject: role === 'owner',
    languageRestricted: level < ROLE_LEVEL.manager,
  };
}
