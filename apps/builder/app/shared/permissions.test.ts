import { describe, test, expect } from "vitest";
import { getPermissions } from "./permissions";

// Free plan permission values
const defaultPlanPermissions = {
  canDownloadAssets: false,
  canRestoreBackups: false,
  allowDynamicData: false,
  allowContentMode: false,
  allowStagingPublish: false,
  allowAdditionalPermissions: false,
  maxContactEmailsPerProject: 0,
  maxDomainsAllowedPerUser: 0,
  maxDailyPublishesPerUser: 10,
  maxWorkspaces: 0,
  canInviteMembers: false,
  canCreateWorkspace: false,
};

const proPlan = {
  canDownloadAssets: true,
  canRestoreBackups: true,
  allowAdditionalPermissions: true,
  allowDynamicData: true,
  allowContentMode: true,
  allowStagingPublish: true,
  maxContactEmailsPerProject: 5,
  maxDomainsAllowedPerUser: 100,
  maxDailyPublishesPerUser: 100,
  maxWorkspaces: 0,
  maxProjectsAllowedPerUser: 100,
  maxAssetsPerProject: 500,
  seatsIncluded: 0,
  maxSeatsPerWorkspace: 0,
};

const freePlan = {
  canDownloadAssets: false,
  canRestoreBackups: false,
  allowAdditionalPermissions: false,
  allowDynamicData: false,
  allowContentMode: false,
  allowStagingPublish: false,
  maxContactEmailsPerProject: 0,
  maxDomainsAllowedPerUser: 0,
  maxDailyPublishesPerUser: 10,
  maxWorkspaces: 0,
  maxProjectsAllowedPerUser: 2,
  maxAssetsPerProject: 50,
  seatsIncluded: 0,
  maxSeatsPerWorkspace: 0,
};

describe("getPermissions", () => {
  describe("role-based permissions", () => {
    test("owner has full role permissions", () => {
      expect(
        getPermissions({
          role: "own",
          planFeatures: freePlan,
          workspaces: [],
        })
      ).toEqual({
        canCreateProject: true,
        canDuplicate: true,
        canRename: true,
        canShare: true,
        canDelete: true,
        canTransfer: true,
        canEditTags: true,
        canOpenSettings: true,
        canPublishToStagingOnly: false,
        ...defaultPlanPermissions,
      });
    });

    test("administrators can create, duplicate, rename, and edit tags", () => {
      const result = getPermissions({
        role: "administrators",
        planFeatures: freePlan,
        workspaces: [],
      });
      expect(result).toEqual({
        canCreateProject: true,
        canDuplicate: true,
        canRename: true,
        canShare: false,
        canDelete: false,
        canTransfer: true,
        canEditTags: true,
        canOpenSettings: false,
        canPublishToStagingOnly: false,
        ...defaultPlanPermissions,
      });
    });

    test("builders can create, duplicate, rename, and edit tags", () => {
      const result = getPermissions({
        role: "builders",
        planFeatures: freePlan,
        workspaces: [],
      });
      expect(result).toEqual({
        canCreateProject: true,
        canDuplicate: true,
        canRename: true,
        canShare: false,
        canDelete: false,
        canTransfer: false,
        canEditTags: true,
        canOpenSettings: false,
        canPublishToStagingOnly: true,
        ...defaultPlanPermissions,
      });
    });

    test("editors can rename and edit tags only", () => {
      const result = getPermissions({
        role: "editors",
        planFeatures: freePlan,
        workspaces: [],
      });
      expect(result).toEqual({
        canCreateProject: false,
        canDuplicate: false,
        canRename: true,
        canShare: false,
        canDelete: false,
        canTransfer: false,
        canEditTags: true,
        canOpenSettings: false,
        canPublishToStagingOnly: false,
        ...defaultPlanPermissions,
      });
    });

    test("viewers have no role-based permissions", () => {
      const result = getPermissions({
        role: "viewers",
        planFeatures: freePlan,
        workspaces: [],
      });
      expect(result).toEqual({
        canCreateProject: false,
        canDuplicate: false,
        canRename: false,
        canShare: false,
        canDelete: false,
        canTransfer: false,
        canEditTags: false,
        canOpenSettings: false,
        canPublishToStagingOnly: false,
        ...defaultPlanPermissions,
      });
    });
  });

  describe("canCreateProject by role", () => {
    test("own → true", () => {
      expect(
        getPermissions({
          role: "own",
          planFeatures: freePlan,
          workspaces: [],
        }).canCreateProject
      ).toBe(true);
    });

    test("administrators → true", () => {
      expect(
        getPermissions({
          role: "administrators",
          planFeatures: freePlan,
          workspaces: [],
        }).canCreateProject
      ).toBe(true);
    });

    test("builders → true", () => {
      expect(
        getPermissions({
          role: "builders",
          planFeatures: freePlan,
          workspaces: [],
        }).canCreateProject
      ).toBe(true);
    });

    test("editors → false", () => {
      expect(
        getPermissions({
          role: "editors",
          planFeatures: freePlan,
          workspaces: [],
        }).canCreateProject
      ).toBe(false);
    });

    test("viewers → false", () => {
      expect(
        getPermissions({
          role: "viewers",
          planFeatures: freePlan,
          workspaces: [],
        }).canCreateProject
      ).toBe(false);
    });
  });

  describe("plan-based permissions", () => {
    test("pro plan enables all plan features", () => {
      const result = getPermissions({
        role: "own",
        planFeatures: proPlan,
        workspaces: [],
      });
      expect(result).toMatchObject({
        allowDynamicData: true,
        allowContentMode: true,
        allowStagingPublish: true,
        allowAdditionalPermissions: true,
        maxContactEmailsPerProject: 5,
        maxDomainsAllowedPerUser: 100,
        maxDailyPublishesPerUser: 100,
        maxWorkspaces: 0,
        canInviteMembers: false,
        canCreateWorkspace: false,
      });
    });

    test("free plan restricts plan features", () => {
      const result = getPermissions({
        role: "own",
        planFeatures: freePlan,
        workspaces: [],
      });
      expect(result).toMatchObject({
        allowDynamicData: false,
        allowContentMode: false,
        allowStagingPublish: false,
        allowAdditionalPermissions: false,
        maxContactEmailsPerProject: 0,
        maxDomainsAllowedPerUser: 0,
        maxDailyPublishesPerUser: 10,
        maxWorkspaces: 0,
        canInviteMembers: false,
        canCreateWorkspace: false,
      });
    });
  });

  describe("allowContentMode with authPermit", () => {
    test("content mode allowed for shared project (view permit)", () => {
      const result = getPermissions({
        role: "own",
        authPermit: "view",
        planFeatures: freePlan,
        workspaces: [],
      });
      expect(result.allowContentMode).toBe(true);
    });

    test("content mode allowed for shared project (edit permit)", () => {
      const result = getPermissions({
        role: "own",
        authPermit: "edit",
        planFeatures: freePlan,
        workspaces: [],
      });
      expect(result.allowContentMode).toBe(true);
    });

    test("content mode allowed for shared project (build permit)", () => {
      const result = getPermissions({
        role: "own",
        authPermit: "build",
        planFeatures: freePlan,
        workspaces: [],
      });
      expect(result.allowContentMode).toBe(true);
    });

    test("content mode allowed for shared project (admin permit)", () => {
      const result = getPermissions({
        role: "own",
        authPermit: "admin",
        planFeatures: freePlan,
        workspaces: [],
      });
      expect(result.allowContentMode).toBe(true);
    });

    test("content mode allowed for shared project with free plan", () => {
      const result = getPermissions({
        role: "own",
        authPermit: "edit",
        planFeatures: freePlan,
        workspaces: [],
      });
      expect(result.allowContentMode).toBe(true);
    });

    test("content mode depends on plan for own project", () => {
      expect(
        getPermissions({
          role: "own",
          authPermit: "own",
          planFeatures: freePlan,
          workspaces: [],
        }).allowContentMode
      ).toBe(false);
      expect(
        getPermissions({
          role: "own",
          authPermit: "own",
          planFeatures: proPlan,
          workspaces: [],
        }).allowContentMode
      ).toBe(true);
    });

    test("content mode denied without authPermit on free plan", () => {
      expect(
        getPermissions({
          role: "own",
          planFeatures: freePlan,
          workspaces: [],
        }).allowContentMode
      ).toBe(false);
    });

    test("content mode allowed without authPermit on pro plan", () => {
      const result = getPermissions({
        role: "own",
        planFeatures: proPlan,
        workspaces: [],
      });
      expect(result.allowContentMode).toBe(true);
    });
  });

  describe("combined role and plan permissions", () => {
    test("viewer on free plan has minimal permissions", () => {
      expect(
        getPermissions({
          role: "viewers",
          planFeatures: freePlan,
          workspaces: [],
        })
      ).toEqual({
        canCreateProject: false,
        canDuplicate: false,
        canRename: false,
        canShare: false,
        canDelete: false,
        canTransfer: false,
        canEditTags: false,
        canOpenSettings: false,
        canDownloadAssets: false,
        canRestoreBackups: false,
        allowDynamicData: false,
        allowContentMode: false,
        allowStagingPublish: false,
        allowAdditionalPermissions: false,
        maxContactEmailsPerProject: 0,
        maxDomainsAllowedPerUser: 0,
        maxDailyPublishesPerUser: 10,
        maxWorkspaces: 0,
        canPublishToStagingOnly: false,
        canInviteMembers: false,
        canCreateWorkspace: false,
      });
    });

    test("builder on pro plan has builder role + all plan features", () => {
      expect(
        getPermissions({
          role: "builders",
          planFeatures: proPlan,
          workspaces: [],
        })
      ).toEqual({
        canCreateProject: true,
        canDuplicate: true,
        canRename: true,
        canShare: false,
        canDelete: false,
        canTransfer: false,
        canEditTags: true,
        canOpenSettings: false,
        canDownloadAssets: true,
        canRestoreBackups: true,
        allowDynamicData: true,
        allowContentMode: true,
        allowStagingPublish: true,
        allowAdditionalPermissions: true,
        maxContactEmailsPerProject: 5,
        maxDomainsAllowedPerUser: 100,
        maxDailyPublishesPerUser: 100,
        maxWorkspaces: 0,
        canPublishToStagingOnly: true,
        canInviteMembers: false,
        canCreateWorkspace: false,
      });
    });

    test("owner on pro plan has all permissions", () => {
      expect(
        getPermissions({
          role: "own",
          planFeatures: proPlan,
          workspaces: [],
        })
      ).toEqual({
        canCreateProject: true,
        canDuplicate: true,
        canRename: true,
        canShare: true,
        canDelete: true,
        canTransfer: true,
        canEditTags: true,
        canOpenSettings: true,
        canDownloadAssets: true,
        canRestoreBackups: true,
        allowDynamicData: true,
        allowContentMode: true,
        allowStagingPublish: true,
        allowAdditionalPermissions: true,
        maxContactEmailsPerProject: 5,
        maxDomainsAllowedPerUser: 100,
        maxDailyPublishesPerUser: 100,
        maxWorkspaces: 0,
        canPublishToStagingOnly: false,
        canInviteMembers: false,
        canCreateWorkspace: false,
      });
    });

    test("administrator on free plan has admin role but limited plan features", () => {
      expect(
        getPermissions({
          role: "administrators",
          planFeatures: freePlan,
          workspaces: [],
        })
      ).toEqual({
        canCreateProject: true,
        canDuplicate: true,
        canRename: true,
        canShare: false,
        canDelete: false,
        canTransfer: true,
        canEditTags: true,
        canOpenSettings: false,
        canDownloadAssets: false,
        canRestoreBackups: false,
        allowDynamicData: false,
        allowContentMode: false,
        allowStagingPublish: false,
        allowAdditionalPermissions: false,
        maxContactEmailsPerProject: 0,
        maxDomainsAllowedPerUser: 0,
        maxDailyPublishesPerUser: 10,
        maxWorkspaces: 0,
        canPublishToStagingOnly: false,
        canInviteMembers: false,
        canCreateWorkspace: false,
      });
    });

    test("editor on pro plan has editor role + all plan features", () => {
      expect(
        getPermissions({
          role: "editors",
          planFeatures: proPlan,
          workspaces: [],
        })
      ).toEqual({
        canCreateProject: false,
        canDuplicate: false,
        canRename: true,
        canShare: false,
        canDelete: false,
        canTransfer: false,
        canEditTags: true,
        canOpenSettings: false,
        canDownloadAssets: true,
        canRestoreBackups: true,
        allowDynamicData: true,
        allowContentMode: true,
        allowStagingPublish: true,
        allowAdditionalPermissions: true,
        maxContactEmailsPerProject: 5,
        maxDomainsAllowedPerUser: 100,
        maxDailyPublishesPerUser: 100,
        maxWorkspaces: 0,
        canPublishToStagingOnly: false,
        canInviteMembers: false,
        canCreateWorkspace: false,
      });
    });
  });

  describe("all three parameters combined", () => {
    test("viewer + free plan + shared project enables only content mode", () => {
      const result = getPermissions({
        role: "viewers",
        planFeatures: freePlan,
        authPermit: "edit",
        workspaces: [],
      });
      // role: all false
      expect(result.canCreateProject).toBe(false);
      expect(result.canDuplicate).toBe(false);
      expect(result.canRename).toBe(false);
      expect(result.canShare).toBe(false);
      expect(result.canDelete).toBe(false);
      expect(result.canEditTags).toBe(false);
      expect(result.canOpenSettings).toBe(false);
      // plan: all false except content mode overridden by shared project access
      expect(result.allowDynamicData).toBe(false);
      expect(result.allowContentMode).toBe(true);
      expect(result.allowStagingPublish).toBe(false);
      expect(result.allowAdditionalPermissions).toBe(false);
    });

    test("builder + pro plan + shared project has builder role + all plan features", () => {
      const result = getPermissions({
        role: "builders",
        planFeatures: proPlan,
        authPermit: "build",
        workspaces: [],
      });
      expect(result.canCreateProject).toBe(true);
      expect(result.canDuplicate).toBe(true);
      expect(result.canRename).toBe(true);
      expect(result.canShare).toBe(false);
      expect(result.canDelete).toBe(false);
      expect(result.canEditTags).toBe(true);
      expect(result.canOpenSettings).toBe(false);
      expect(result.allowDynamicData).toBe(true);
      expect(result.allowContentMode).toBe(true);
      expect(result.allowStagingPublish).toBe(true);
      expect(result.allowAdditionalPermissions).toBe(true);
    });
  });

  describe("maxContactEmailsPerProject", () => {
    test("defaults to 0 on free plan", () => {
      expect(
        getPermissions({
          role: "own",
          planFeatures: freePlan,
          workspaces: [],
        }).maxContactEmailsPerProject
      ).toBe(0);
    });

    test("reflects plan value", () => {
      expect(
        getPermissions({
          role: "own",
          planFeatures: proPlan,
          workspaces: [],
        }).maxContactEmailsPerProject
      ).toBe(5);
    });
  });

  describe("maxDomainsAllowedPerUser", () => {
    test("defaults to 0 on free plan", () => {
      expect(
        getPermissions({
          role: "own",
          planFeatures: freePlan,
          workspaces: [],
        }).maxDomainsAllowedPerUser
      ).toBe(0);
    });

    test("reflects plan value", () => {
      expect(
        getPermissions({
          role: "own",
          planFeatures: proPlan,
          workspaces: [],
        }).maxDomainsAllowedPerUser
      ).toBe(100);
    });

    test("free plan has 0", () => {
      expect(
        getPermissions({
          role: "own",
          planFeatures: freePlan,
          workspaces: [],
        }).maxDomainsAllowedPerUser
      ).toBe(0);
    });
  });

  describe("maxDailyPublishesPerUser", () => {
    test("defaults to 10 on free plan", () => {
      expect(
        getPermissions({
          role: "own",
          planFeatures: freePlan,
          workspaces: [],
        }).maxDailyPublishesPerUser
      ).toBe(10);
    });

    test("reflects plan value for pro", () => {
      expect(
        getPermissions({
          role: "own",
          planFeatures: proPlan,
          workspaces: [],
        }).maxDailyPublishesPerUser
      ).toBe(100);
    });

    test("free plan allows limited publishes", () => {
      expect(
        getPermissions({
          role: "own",
          planFeatures: freePlan,
          workspaces: [],
        }).maxDailyPublishesPerUser
      ).toBe(10);
    });
  });

  describe("canInviteMembers", () => {
    test("false when maxWorkspaces is 0", () => {
      expect(
        getPermissions({
          role: "own",
          planFeatures: freePlan,
          workspaces: [],
        }).canInviteMembers
      ).toBe(false);
    });

    test("false when maxWorkspaces is 1", () => {
      expect(
        getPermissions({
          role: "own",
          planFeatures: { ...freePlan, maxWorkspaces: 1 },
          workspaces: [],
        }).canInviteMembers
      ).toBe(false);
    });

    test("true when maxWorkspaces is greater than 1", () => {
      expect(
        getPermissions({
          role: "own",
          planFeatures: { ...freePlan, maxWorkspaces: 5 },
          workspaces: [],
        }).canInviteMembers
      ).toBe(true);
    });
  });

  describe("canCreateWorkspace", () => {
    test("false when owned count equals maxWorkspaces", () => {
      expect(
        getPermissions({
          role: "own",
          planFeatures: { ...freePlan, maxWorkspaces: 1 },
          workspaces: [{ role: "own" }],
        }).canCreateWorkspace
      ).toBe(false);
    });

    test("false when owned count exceeds maxWorkspaces", () => {
      expect(
        getPermissions({
          role: "own",
          planFeatures: { ...freePlan, maxWorkspaces: 1 },
          workspaces: [{ role: "own" }, { role: "own" }],
        }).canCreateWorkspace
      ).toBe(false);
    });

    test("true when owned count is below maxWorkspaces", () => {
      expect(
        getPermissions({
          role: "own",
          planFeatures: { ...freePlan, maxWorkspaces: 3 },
          workspaces: [{ role: "own" }],
        }).canCreateWorkspace
      ).toBe(true);
    });

    test("counts only owned workspaces, not shared", () => {
      expect(
        getPermissions({
          role: "own",
          planFeatures: { ...freePlan, maxWorkspaces: 2 },
          workspaces: [
            { role: "own" },
            { role: "editors" },
            { role: "viewers" },
          ],
        }).canCreateWorkspace
      ).toBe(true);
    });

    test("false when maxWorkspaces is 0", () => {
      expect(
        getPermissions({
          role: "own",
          planFeatures: freePlan,
          workspaces: [],
        }).canCreateWorkspace
      ).toBe(false);
    });

    test("defaults to empty workspaces", () => {
      expect(
        getPermissions({
          role: "own",
          planFeatures: { ...freePlan, maxWorkspaces: 5 },
          workspaces: [],
        }).canCreateWorkspace
      ).toBe(true);
    });
  });

  describe("canPublishToStagingOnly", () => {
    test("own → false (full publish access)", () => {
      expect(
        getPermissions({
          role: "own",
          planFeatures: freePlan,
          workspaces: [],
        }).canPublishToStagingOnly
      ).toBe(false);
    });

    test("administrators → false (full publish access)", () => {
      expect(
        getPermissions({
          role: "administrators",
          planFeatures: freePlan,
          workspaces: [],
        }).canPublishToStagingOnly
      ).toBe(false);
    });

    test("builders → true (staging only)", () => {
      expect(
        getPermissions({
          role: "builders",
          planFeatures: freePlan,
          workspaces: [],
        }).canPublishToStagingOnly
      ).toBe(true);
    });

    test("editors → false (no publish access)", () => {
      expect(
        getPermissions({
          role: "editors",
          planFeatures: freePlan,
          workspaces: [],
        }).canPublishToStagingOnly
      ).toBe(false);
    });

    test("viewers → false (no publish access)", () => {
      expect(
        getPermissions({
          role: "viewers",
          planFeatures: freePlan,
          workspaces: [],
        }).canPublishToStagingOnly
      ).toBe(false);
    });

    test("authPermit 'build' → true (share-link builder, staging only)", () => {
      expect(
        getPermissions({
          role: "own",
          authPermit: "build",
          planFeatures: freePlan,
          workspaces: [],
        }).canPublishToStagingOnly
      ).toBe(true);
    });

    test("authPermit 'admin' → false (share-link admin, full access through canPublish)", () => {
      expect(
        getPermissions({
          role: "own",
          authPermit: "admin",
          planFeatures: freePlan,
          workspaces: [],
        }).canPublishToStagingOnly
      ).toBe(false);
    });
  });
});
