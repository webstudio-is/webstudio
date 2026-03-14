import type { MemberRelation } from "@webstudio-is/project";
import type { AuthPermit } from "@webstudio-is/trpc-interface/index.server";
import type { UserPlanFeatures } from "~/shared/db/user-plan-features.server";

/**
 * Single source of truth for all user permissions. Combines workspace
 * role-based access with subscription plan features.
 *
 * All inputs are optional:
 *   - omit `userRelation` for personal projects (all role-actions allowed)
 *   - omit `userPlanFeatures` when plan info is unavailable (most restrictive)
 *   - omit `authPermit` when outside the builder context
 *
 * Role-based permission mapping (mirrors backend checks):
 *   own / undefined   → all actions
 *   administrators    → create, duplicate, rename, tags
 *   builders          → create, duplicate, rename, tags
 *   editors           → rename, tags
 *   viewers           → open in safe mode only (handled by caller)
 */
export const getPermissions = ({
  userRelation,
  userPlanFeatures,
  authPermit,
}: {
  userRelation?: MemberRelation | "own";
  userPlanFeatures?: UserPlanFeatures;
  authPermit?: AuthPermit;
}) => {
  // Personal projects (no workspace) → full role permissions
  const isOwn = userRelation === undefined || userRelation === "own";
  const isBuilder =
    userRelation === "builders" || userRelation === "administrators";
  const isEditor = userRelation === "editors" || isBuilder;
  // Content mode is always available in shared projects (non-owner access)
  // because content mode is a safe/restricted editing mode.
  // authPermit is server-validated, so we trust it here.
  const isSharedProject = authPermit !== undefined && authPermit !== "own";

  return {
    // Workspace role permissions
    canCreateProject: isOwn || isBuilder,
    canDuplicate: isOwn || isBuilder,
    canRename: isOwn || isEditor,
    canShare: isOwn,
    canDelete: isOwn,
    canEditTags: isOwn || isEditor,
    canOpenSettings: isOwn,
    // Plan feature permissions
    allowDynamicData: userPlanFeatures?.allowDynamicData ?? false,
    allowContentMode:
      isSharedProject || (userPlanFeatures?.allowContentMode ?? false),
    allowStagingPublish: userPlanFeatures?.allowStagingPublish ?? false,
    allowAdditionalPermissions:
      userPlanFeatures?.allowAdditionalPermissions ?? false,
    maxContactEmails: userPlanFeatures?.maxContactEmails ?? 0,
    maxDomainsAllowedPerUser: userPlanFeatures?.maxDomainsAllowedPerUser ?? 0,
    maxPublishesAllowedPerUser:
      userPlanFeatures?.maxPublishesAllowedPerUser ?? 0,
    purchases: userPlanFeatures?.purchases ?? [],
  };
};
