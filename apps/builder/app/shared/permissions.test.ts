import { describe, test, expect } from "vitest";
import { getPermissions } from "./permissions";

// Default plan permission values when userPlanFeatures is not provided
const defaultPlanPermissions = {
  allowDynamicData: false,
  allowContentMode: false,
  allowStagingPublish: false,
  allowAdditionalPermissions: false,
  maxContactEmails: 0,
  maxDomainsAllowedPerUser: 0,
  maxPublishesAllowedPerUser: 0,
  purchases: [],
};

const proPlan = {
  allowAdditionalPermissions: true,
  allowDynamicData: true,
  allowContentMode: true,
  allowStagingPublish: true,
  maxContactEmails: 5,
  maxDomainsAllowedPerUser: Number.MAX_SAFE_INTEGER,
  maxPublishesAllowedPerUser: Number.MAX_SAFE_INTEGER,
  purchases: [{ planName: "Pro" }],
};

const freePlan = {
  allowAdditionalPermissions: false,
  allowDynamicData: false,
  allowContentMode: false,
  allowStagingPublish: false,
  maxContactEmails: 0,
  maxDomainsAllowedPerUser: 0,
  maxPublishesAllowedPerUser: 10,
  purchases: [],
};

describe("getPermissions", () => {
  describe("role-based permissions", () => {
    test("personal projects (no relation) have full role permissions", () => {
      expect(getPermissions({})).toEqual({
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

    test("workspace owner has full role permissions", () => {
      expect(getPermissions({ userRelation: "own" })).toEqual({
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
      const result = getPermissions({ userRelation: "administrators" });
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
      const result = getPermissions({ userRelation: "builders" });
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
      const result = getPermissions({ userRelation: "editors" });
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
      const result = getPermissions({ userRelation: "viewers" });
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
      expect(getPermissions({ userRelation: "own" }).canCreateProject).toBe(
        true
      );
    });

    test("undefined (personal) → true", () => {
      expect(getPermissions({}).canCreateProject).toBe(true);
    });

    test("administrators → true", () => {
      expect(
        getPermissions({ userRelation: "administrators" }).canCreateProject
      ).toBe(true);
    });

    test("builders → true", () => {
      expect(
        getPermissions({ userRelation: "builders" }).canCreateProject
      ).toBe(true);
    });

    test("editors → false", () => {
      expect(getPermissions({ userRelation: "editors" }).canCreateProject).toBe(
        false
      );
    });

    test("viewers → false", () => {
      expect(getPermissions({ userRelation: "viewers" }).canCreateProject).toBe(
        false
      );
    });
  });

  describe("plan-based permissions", () => {
    test("pro plan enables all plan features", () => {
      const result = getPermissions({ userPlanFeatures: proPlan });
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
      const result = getPermissions({ userPlanFeatures: freePlan });
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

    test("purchases array is passed through from pro plan", () => {
      const result = getPermissions({ userPlanFeatures: proPlan });
      expect(result.purchases).toEqual([{ planName: "Pro" }]);
    });

    test("purchases is empty array for free plan", () => {
      const result = getPermissions({ userPlanFeatures: freePlan });
      expect(result.purchases).toEqual([]);
    });

    test("purchases defaults to empty array when userPlanFeatures is not provided", () => {
      expect(getPermissions({}).purchases).toEqual([]);
    });
  });

  describe("allowContentMode with authPermit", () => {
    test("content mode allowed for shared project (view permit)", () => {
      const result = getPermissions({ authPermit: "view" });
      expect(result.allowContentMode).toBe(true);
    });

    test("content mode allowed for shared project (edit permit)", () => {
      const result = getPermissions({ authPermit: "edit" });
      expect(result.allowContentMode).toBe(true);
    });

    test("content mode allowed for shared project (build permit)", () => {
      const result = getPermissions({ authPermit: "build" });
      expect(result.allowContentMode).toBe(true);
    });

    test("content mode allowed for shared project (admin permit)", () => {
      const result = getPermissions({ authPermit: "admin" });
      expect(result.allowContentMode).toBe(true);
    });

    test("content mode allowed for shared project with free plan", () => {
      const result = getPermissions({
        authPermit: "edit",
        userPlanFeatures: freePlan,
      });
      expect(result.allowContentMode).toBe(true);
    });

    test("content mode depends on plan for own project", () => {
      expect(getPermissions({ authPermit: "own" }).allowContentMode).toBe(
        false
      );
      expect(
        getPermissions({ authPermit: "own", userPlanFeatures: proPlan })
          .allowContentMode
      ).toBe(true);
    });

    test("content mode denied without authPermit and without plan features", () => {
      expect(getPermissions({}).allowContentMode).toBe(false);
    });

    test("content mode denied without authPermit on free plan", () => {
      const result = getPermissions({ userPlanFeatures: freePlan });
      expect(result.allowContentMode).toBe(false);
    });

    test("content mode allowed without authPermit on pro plan", () => {
      const result = getPermissions({ userPlanFeatures: proPlan });
      expect(result.allowContentMode).toBe(true);
    });
  });

  describe("combined role and plan permissions", () => {
    test("viewer on free plan has minimal permissions", () => {
      expect(
        getPermissions({ userRelation: "viewers", userPlanFeatures: freePlan })
      ).toEqual({
        canCreateProject: false,
        canDuplicate: false,
        canRename: false,
        canShare: false,
        canDelete: false,
        canEditTags: false,
        canOpenSettings: false,
        allowDynamicData: false,
        allowContentMode: false,
        allowStagingPublish: false,
        allowAdditionalPermissions: false,
        maxContactEmails: 0,
        maxDomainsAllowedPerUser: 0,
        maxPublishesAllowedPerUser: 10,
        purchases: [],
      });
    });

    test("builder on pro plan has builder role + all plan features", () => {
      expect(
        getPermissions({ userRelation: "builders", userPlanFeatures: proPlan })
      ).toEqual({
        canCreateProject: true,
        canDuplicate: true,
        canRename: true,
        canShare: false,
        canDelete: false,
        canEditTags: true,
        canOpenSettings: false,
        allowDynamicData: true,
        allowContentMode: true,
        allowStagingPublish: true,
        allowAdditionalPermissions: true,
        maxContactEmails: 5,
        maxDomainsAllowedPerUser: Number.MAX_SAFE_INTEGER,
        maxPublishesAllowedPerUser: Number.MAX_SAFE_INTEGER,
        purchases: [{ planName: "Pro" }],
      });
    });

    test("owner on pro plan has all permissions", () => {
      expect(
        getPermissions({ userRelation: "own", userPlanFeatures: proPlan })
      ).toEqual({
        canCreateProject: true,
        canDuplicate: true,
        canRename: true,
        canShare: true,
        canDelete: true,
        canEditTags: true,
        canOpenSettings: true,
        allowDynamicData: true,
        allowContentMode: true,
        allowStagingPublish: true,
        allowAdditionalPermissions: true,
        maxContactEmails: 5,
        maxDomainsAllowedPerUser: Number.MAX_SAFE_INTEGER,
        maxPublishesAllowedPerUser: Number.MAX_SAFE_INTEGER,
        purchases: [{ planName: "Pro" }],
      });
    });

    test("administrator on free plan has admin role but limited plan features", () => {
      expect(
        getPermissions({
          userRelation: "administrators",
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
        allowDynamicData: false,
        allowContentMode: false,
        allowStagingPublish: false,
        allowAdditionalPermissions: false,
        maxContactEmails: 0,
        maxDomainsAllowedPerUser: 0,
        maxPublishesAllowedPerUser: 10,
        purchases: [],
      });
    });

    test("editor on pro plan has editor role + all plan features", () => {
      expect(
        getPermissions({ userRelation: "editors", userPlanFeatures: proPlan })
      ).toEqual({
        canCreateProject: false,
        canDuplicate: false,
        canRename: true,
        canShare: false,
        canDelete: false,
        canEditTags: true,
        canOpenSettings: false,
        allowDynamicData: true,
        allowContentMode: true,
        allowStagingPublish: true,
        allowAdditionalPermissions: true,
        maxContactEmails: 5,
        maxDomainsAllowedPerUser: Number.MAX_SAFE_INTEGER,
        maxPublishesAllowedPerUser: Number.MAX_SAFE_INTEGER,
        purchases: [{ planName: "Pro" }],
      });
    });
  });

  describe("all three parameters combined", () => {
    test("viewer + free plan + shared project enables only content mode", () => {
      const result = getPermissions({
        userRelation: "viewers",
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
        userRelation: "builders",
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
      expect(result.purchases).toEqual([{ planName: "Pro" }]);
    });
  });

  describe("maxContactEmails", () => {
    test("defaults to 0 when no plan features", () => {
      expect(getPermissions({}).maxContactEmails).toBe(0);
    });

    test("reflects plan value", () => {
      expect(
        getPermissions({ userPlanFeatures: proPlan }).maxContactEmails
      ).toBe(5);
    });
  });

  describe("maxDomainsAllowedPerUser", () => {
    test("defaults to 0 when no plan features", () => {
      expect(getPermissions({}).maxDomainsAllowedPerUser).toBe(0);
    });

    test("reflects plan value", () => {
      expect(
        getPermissions({ userPlanFeatures: proPlan }).maxDomainsAllowedPerUser
      ).toBe(Number.MAX_SAFE_INTEGER);
    });

    test("free plan has 0", () => {
      expect(
        getPermissions({ userPlanFeatures: freePlan }).maxDomainsAllowedPerUser
      ).toBe(0);
    });
  });

  describe("maxPublishesAllowedPerUser", () => {
    test("defaults to 0 when no plan features", () => {
      expect(getPermissions({}).maxPublishesAllowedPerUser).toBe(0);
    });

    test("reflects plan value for pro", () => {
      expect(
        getPermissions({ userPlanFeatures: proPlan }).maxPublishesAllowedPerUser
      ).toBe(Number.MAX_SAFE_INTEGER);
    });

    test("free plan allows limited publishes", () => {
      expect(
        getPermissions({ userPlanFeatures: freePlan })
          .maxPublishesAllowedPerUser
      ).toBe(10);
    });
  });
});
