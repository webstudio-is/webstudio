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
  maxContactEmails: 0,
  maxDomainsAllowedPerUser: 0,
  maxPublishesAllowedPerUser: 10,
};

const proPlan = {
  canDownloadAssets: true,
  canRestoreBackups: true,
  allowAdditionalPermissions: true,
  allowDynamicData: true,
  allowContentMode: true,
  allowStagingPublish: true,
  maxContactEmails: 5,
  maxDomainsAllowedPerUser: Number.MAX_SAFE_INTEGER,
  maxPublishesAllowedPerUser: Number.MAX_SAFE_INTEGER,
};

const freePlan = {
  canDownloadAssets: false,
  canRestoreBackups: false,
  allowAdditionalPermissions: false,
  allowDynamicData: false,
  allowContentMode: false,
  allowStagingPublish: false,
  maxContactEmails: 0,
  maxDomainsAllowedPerUser: 0,
  maxPublishesAllowedPerUser: 10,
};

describe("getPermissions", () => {
  describe("role-based permissions", () => {
    test("owner has full role permissions", () => {
      expect(
        getPermissions({ workspaceRelation: "own", userPlanFeatures: freePlan })
      ).toEqual({
        canCreateProject: true,
        canDuplicate: true,
        canRename: true,
        canShare: true,
        canDelete: true,
        canEditTags: true,
        canOpenSettings: true,
        ...defaultPlanPermissions,
      });
    });

    test("administrators can create, duplicate, rename, and edit tags", () => {
      const result = getPermissions({
        workspaceRelation: "administrators",
        userPlanFeatures: freePlan,
      });
      expect(result).toEqual({
        canCreateProject: true,
        canDuplicate: true,
        canRename: true,
        canShare: false,
        canDelete: false,
        canEditTags: true,
        canOpenSettings: false,
        ...defaultPlanPermissions,
      });
    });

    test("builders can create, duplicate, rename, and edit tags", () => {
      const result = getPermissions({
        workspaceRelation: "builders",
        userPlanFeatures: freePlan,
      });
      expect(result).toEqual({
        canCreateProject: true,
        canDuplicate: true,
        canRename: true,
        canShare: false,
        canDelete: false,
        canEditTags: true,
        canOpenSettings: false,
        ...defaultPlanPermissions,
      });
    });

    test("editors can rename and edit tags only", () => {
      const result = getPermissions({
        workspaceRelation: "editors",
        userPlanFeatures: freePlan,
      });
      expect(result).toEqual({
        canCreateProject: false,
        canDuplicate: false,
        canRename: true,
        canShare: false,
        canDelete: false,
        canEditTags: true,
        canOpenSettings: false,
        ...defaultPlanPermissions,
      });
    });

    test("viewers have no role-based permissions", () => {
      const result = getPermissions({
        workspaceRelation: "viewers",
        userPlanFeatures: freePlan,
      });
      expect(result).toEqual({
        canCreateProject: false,
        canDuplicate: false,
        canRename: false,
        canShare: false,
        canDelete: false,
        canEditTags: false,
        canOpenSettings: false,
        ...defaultPlanPermissions,
      });
    });
  });

  describe("canCreateProject by role", () => {
    test("own → true", () => {
      expect(
        getPermissions({ workspaceRelation: "own", userPlanFeatures: freePlan })
          .canCreateProject
      ).toBe(true);
    });

    test("administrators → true", () => {
      expect(
        getPermissions({
          workspaceRelation: "administrators",
          userPlanFeatures: freePlan,
        }).canCreateProject
      ).toBe(true);
    });

    test("builders → true", () => {
      expect(
        getPermissions({
          workspaceRelation: "builders",
          userPlanFeatures: freePlan,
        }).canCreateProject
      ).toBe(true);
    });

    test("editors → false", () => {
      expect(
        getPermissions({
          workspaceRelation: "editors",
          userPlanFeatures: freePlan,
        }).canCreateProject
      ).toBe(false);
    });

    test("viewers → false", () => {
      expect(
        getPermissions({
          workspaceRelation: "viewers",
          userPlanFeatures: freePlan,
        }).canCreateProject
      ).toBe(false);
    });
  });

  describe("plan-based permissions", () => {
    test("pro plan enables all plan features", () => {
      const result = getPermissions({
        workspaceRelation: "own",
        userPlanFeatures: proPlan,
      });
      expect(result).toMatchObject({
        allowDynamicData: true,
        allowContentMode: true,
        allowStagingPublish: true,
        allowAdditionalPermissions: true,
        maxContactEmails: 5,
        maxDomainsAllowedPerUser: Number.MAX_SAFE_INTEGER,
        maxPublishesAllowedPerUser: Number.MAX_SAFE_INTEGER,
      });
    });

    test("free plan restricts plan features", () => {
      const result = getPermissions({
        workspaceRelation: "own",
        userPlanFeatures: freePlan,
      });
      expect(result).toMatchObject({
        allowDynamicData: false,
        allowContentMode: false,
        allowStagingPublish: false,
        allowAdditionalPermissions: false,
        maxContactEmails: 0,
        maxDomainsAllowedPerUser: 0,
        maxPublishesAllowedPerUser: 10,
      });
    });
  });

  describe("allowContentMode with authPermit", () => {
    test("content mode allowed for shared project (view permit)", () => {
      const result = getPermissions({
        workspaceRelation: "own",
        authPermit: "view",
        userPlanFeatures: freePlan,
      });
      expect(result.allowContentMode).toBe(true);
    });

    test("content mode allowed for shared project (edit permit)", () => {
      const result = getPermissions({
        workspaceRelation: "own",
        authPermit: "edit",
        userPlanFeatures: freePlan,
      });
      expect(result.allowContentMode).toBe(true);
    });

    test("content mode allowed for shared project (build permit)", () => {
      const result = getPermissions({
        workspaceRelation: "own",
        authPermit: "build",
        userPlanFeatures: freePlan,
      });
      expect(result.allowContentMode).toBe(true);
    });

    test("content mode allowed for shared project (admin permit)", () => {
      const result = getPermissions({
        workspaceRelation: "own",
        authPermit: "admin",
        userPlanFeatures: freePlan,
      });
      expect(result.allowContentMode).toBe(true);
    });

    test("content mode allowed for shared project with free plan", () => {
      const result = getPermissions({
        workspaceRelation: "own",
        authPermit: "edit",
        userPlanFeatures: freePlan,
      });
      expect(result.allowContentMode).toBe(true);
    });

    test("content mode depends on plan for own project", () => {
      expect(
        getPermissions({
          workspaceRelation: "own",
          authPermit: "own",
          userPlanFeatures: freePlan,
        }).allowContentMode
      ).toBe(false);
      expect(
        getPermissions({
          workspaceRelation: "own",
          authPermit: "own",
          userPlanFeatures: proPlan,
        }).allowContentMode
      ).toBe(true);
    });

    test("content mode denied without authPermit on free plan", () => {
      expect(
        getPermissions({
          workspaceRelation: "own",
          userPlanFeatures: freePlan,
        }).allowContentMode
      ).toBe(false);
    });

    test("content mode allowed without authPermit on pro plan", () => {
      const result = getPermissions({
        workspaceRelation: "own",
        userPlanFeatures: proPlan,
      });
      expect(result.allowContentMode).toBe(true);
    });
  });

  describe("combined role and plan permissions", () => {
    test("viewer on free plan has minimal permissions", () => {
      expect(
        getPermissions({
          workspaceRelation: "viewers",
          userPlanFeatures: freePlan,
        })
      ).toEqual({
        canCreateProject: false,
        canDuplicate: false,
        canRename: false,
        canShare: false,
        canDelete: false,
        canEditTags: false,
        canOpenSettings: false,
        canDownloadAssets: false,
        canRestoreBackups: false,
        allowDynamicData: false,
        allowContentMode: false,
        allowStagingPublish: false,
        allowAdditionalPermissions: false,
        maxContactEmails: 0,
        maxDomainsAllowedPerUser: 0,
        maxPublishesAllowedPerUser: 10,
      });
    });

    test("builder on pro plan has builder role + all plan features", () => {
      expect(
        getPermissions({
          workspaceRelation: "builders",
          userPlanFeatures: proPlan,
        })
      ).toEqual({
        canCreateProject: true,
        canDuplicate: true,
        canRename: true,
        canShare: false,
        canDelete: false,
        canEditTags: true,
        canOpenSettings: false,
        canDownloadAssets: true,
        canRestoreBackups: true,
        allowDynamicData: true,
        allowContentMode: true,
        allowStagingPublish: true,
        allowAdditionalPermissions: true,
        maxContactEmails: 5,
        maxDomainsAllowedPerUser: Number.MAX_SAFE_INTEGER,
        maxPublishesAllowedPerUser: Number.MAX_SAFE_INTEGER,
      });
    });

    test("owner on pro plan has all permissions", () => {
      expect(
        getPermissions({ workspaceRelation: "own", userPlanFeatures: proPlan })
      ).toEqual({
        canCreateProject: true,
        canDuplicate: true,
        canRename: true,
        canShare: true,
        canDelete: true,
        canEditTags: true,
        canOpenSettings: true,
        canDownloadAssets: true,
        canRestoreBackups: true,
        allowDynamicData: true,
        allowContentMode: true,
        allowStagingPublish: true,
        allowAdditionalPermissions: true,
        maxContactEmails: 5,
        maxDomainsAllowedPerUser: Number.MAX_SAFE_INTEGER,
        maxPublishesAllowedPerUser: Number.MAX_SAFE_INTEGER,
      });
    });

    test("administrator on free plan has admin role but limited plan features", () => {
      expect(
        getPermissions({
          workspaceRelation: "administrators",
          userPlanFeatures: freePlan,
        })
      ).toEqual({
        canCreateProject: true,
        canDuplicate: true,
        canRename: true,
        canShare: false,
        canDelete: false,
        canEditTags: true,
        canOpenSettings: false,
        canDownloadAssets: false,
        canRestoreBackups: false,
        allowDynamicData: false,
        allowContentMode: false,
        allowStagingPublish: false,
        allowAdditionalPermissions: false,
        maxContactEmails: 0,
        maxDomainsAllowedPerUser: 0,
        maxPublishesAllowedPerUser: 10,
      });
    });

    test("editor on pro plan has editor role + all plan features", () => {
      expect(
        getPermissions({
          workspaceRelation: "editors",
          userPlanFeatures: proPlan,
        })
      ).toEqual({
        canCreateProject: false,
        canDuplicate: false,
        canRename: true,
        canShare: false,
        canDelete: false,
        canEditTags: true,
        canOpenSettings: false,
        canDownloadAssets: true,
        canRestoreBackups: true,
        allowDynamicData: true,
        allowContentMode: true,
        allowStagingPublish: true,
        allowAdditionalPermissions: true,
        maxContactEmails: 5,
        maxDomainsAllowedPerUser: Number.MAX_SAFE_INTEGER,
        maxPublishesAllowedPerUser: Number.MAX_SAFE_INTEGER,
      });
    });
  });

  describe("all three parameters combined", () => {
    test("viewer + free plan + shared project enables only content mode", () => {
      const result = getPermissions({
        workspaceRelation: "viewers",
        userPlanFeatures: freePlan,
        authPermit: "edit",
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
        workspaceRelation: "builders",
        userPlanFeatures: proPlan,
        authPermit: "build",
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

  describe("maxContactEmails", () => {
    test("defaults to 0 on free plan", () => {
      expect(
        getPermissions({ workspaceRelation: "own", userPlanFeatures: freePlan })
          .maxContactEmails
      ).toBe(0);
    });

    test("reflects plan value", () => {
      expect(
        getPermissions({ workspaceRelation: "own", userPlanFeatures: proPlan })
          .maxContactEmails
      ).toBe(5);
    });
  });

  describe("maxDomainsAllowedPerUser", () => {
    test("defaults to 0 on free plan", () => {
      expect(
        getPermissions({ workspaceRelation: "own", userPlanFeatures: freePlan })
          .maxDomainsAllowedPerUser
      ).toBe(0);
    });

    test("reflects plan value", () => {
      expect(
        getPermissions({ workspaceRelation: "own", userPlanFeatures: proPlan })
          .maxDomainsAllowedPerUser
      ).toBe(Number.MAX_SAFE_INTEGER);
    });

    test("free plan has 0", () => {
      expect(
        getPermissions({ workspaceRelation: "own", userPlanFeatures: freePlan })
          .maxDomainsAllowedPerUser
      ).toBe(0);
    });
  });

  describe("maxPublishesAllowedPerUser", () => {
    test("defaults to 10 on free plan", () => {
      expect(
        getPermissions({ workspaceRelation: "own", userPlanFeatures: freePlan })
          .maxPublishesAllowedPerUser
      ).toBe(10);
    });

    test("reflects plan value for pro", () => {
      expect(
        getPermissions({ workspaceRelation: "own", userPlanFeatures: proPlan })
          .maxPublishesAllowedPerUser
      ).toBe(Number.MAX_SAFE_INTEGER);
    });

    test("free plan allows limited publishes", () => {
      expect(
        getPermissions({ workspaceRelation: "own", userPlanFeatures: freePlan })
          .maxPublishesAllowedPerUser
      ).toBe(10);
    });
  });
});
