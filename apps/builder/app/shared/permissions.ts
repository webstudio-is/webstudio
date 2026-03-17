import type { WorkspaceRelation } from "@webstudio-is/project";
import type { AuthPermit } from "@webstudio-is/trpc-interface/index.server";
import type { UserPlanFeatures } from "@webstudio-is/trpc-interface/user-plan-features";

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
  workspaceRelation,
  userPlanFeatures,
  authPermit,
  workspaces,
}: {
  workspaceRelation: WorkspaceRelation | "own";
  userPlanFeatures: UserPlanFeatures;
  authPermit?: AuthPermit;
  workspaces: Array<{ workspaceRelation: WorkspaceRelation | "own" }>;
}) => {
  const isOwn = workspaceRelation === "own";
  const isAdmin = workspaceRelation === "administrators";
  const isBuilder = workspaceRelation === "builders" || isAdmin;
  const isEditor = workspaceRelation === "editors" || isBuilder;
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
    // Plan feature permissions
    canDownloadAssets: userPlanFeatures.canDownloadAssets,
    canRestoreBackups: userPlanFeatures.canRestoreBackups,
    allowDynamicData: userPlanFeatures.allowDynamicData,
    allowContentMode: isSharedProject || userPlanFeatures.allowContentMode,
    allowStagingPublish: userPlanFeatures.allowStagingPublish,
    allowAdditionalPermissions: userPlanFeatures.allowAdditionalPermissions,
    maxContactEmails: userPlanFeatures.maxContactEmails,
    maxDomainsAllowedPerUser: userPlanFeatures.maxDomainsAllowedPerUser,
    maxPublishesAllowedPerUser: userPlanFeatures.maxPublishesAllowedPerUser,
    maxWorkspaces: userPlanFeatures.maxWorkspaces,
    canInviteMembers: userPlanFeatures.maxWorkspaces > 1,
    canCreateWorkspace:
      workspaces.filter((w) => w.workspaceRelation === "own").length <
      userPlanFeatures.maxWorkspaces,
  };
};
