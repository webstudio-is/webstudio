import type { Role } from "@webstudio-is/project";
import type { AuthPermit } from "@webstudio-is/trpc-interface/index.server";
import type { PlanFeatures } from "@webstudio-is/plans";

/**
 * Human-readable descriptions of what each workspace role can do.
 * Mirrors the role-based permission logic in getPermissions().
 */
export const roleDescriptions: Record<Role, string> = {
  viewers: "Can view, copy instances, and clone the project.",
  editors: "Can edit content only — text, images, and predefined components.",
  builders: "Can make any design changes and publish to staging only.",
  administrators: "Can make any design changes and publish to custom domains.",
};

/**
 * Single source of truth for all user permissions. Combines workspace
 * role-based access with subscription plan features.
 *
 * Role-based permission mapping (mirrors backend checks):
 *   own              → all actions
 *   administrators   → create, duplicate, rename, tags, transfer
 *   builders         → create, duplicate, rename, tags
 *   editors          → rename, tags
 *   viewers          → open in safe mode only (handled by caller)
 */
export const getPermissions = ({
  role,
  planFeatures,
  authPermit,
  workspaces,
}: {
  role: Role | "own";
  planFeatures: PlanFeatures;
  authPermit?: AuthPermit;
  workspaces: Array<{ role: Role | "own" }>;
}) => {
  const isOwn = role === "own";
  const isAdmin = role === "administrators";
  const isBuilder = role === "builders" || isAdmin;
  const isEditor = role === "editors" || isBuilder;
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
    canTransfer: isOwn || isAdmin,
    canEditTags: isOwn || isEditor,
    canOpenSettings: isOwn,
    // Builders (but not admins/owners) can publish to staging only.
    // Share-link users with "build" permit have the same restriction.
    canPublishToStagingOnly:
      (isBuilder && !isAdmin && !isOwn) || authPermit === "build",
    // Plan feature permissions
    canDownloadAssets: planFeatures.canDownloadAssets,
    canRestoreBackups: planFeatures.canRestoreBackups,
    allowDynamicData: planFeatures.allowDynamicData,
    allowContentMode: isSharedProject || planFeatures.allowContentMode,
    allowStagingPublish: planFeatures.allowStagingPublish,
    allowAdditionalPermissions: planFeatures.allowAdditionalPermissions,
    maxContactEmailsPerProject: planFeatures.maxContactEmailsPerProject,
    maxDomainsAllowedPerUser: planFeatures.maxDomainsAllowedPerUser,
    maxDailyPublishesPerUser: planFeatures.maxDailyPublishesPerUser,
    maxWorkspaces: planFeatures.maxWorkspaces,
    canInviteMembers: planFeatures.maxWorkspaces > 1,
    canCreateWorkspace:
      workspaces.filter((w) => w.role === "own").length <
      planFeatures.maxWorkspaces,
  };
};
