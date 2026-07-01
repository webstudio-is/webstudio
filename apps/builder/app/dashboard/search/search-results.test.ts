import { describe, expect, test } from "vitest";
import type { DashboardProject } from "@webstudio-is/dashboard";
import { searchProjects } from "./search-results";

const createProject = (
  overrides: Partial<DashboardProject>
): DashboardProject =>
  ({
    id: "project-1",
    createdAt: "2024-01-01T00:00:00.000Z",
    title: "Default Site",
    domain: "default",
    userId: "user-1",
    isDeleted: false,
    isPublished: false,
    latestBuild: null,
    previewImageAsset: null,
    previewImageAssetId: null,
    latestBuildVirtual: null,
    marketplaceApprovalStatus: "UNLISTED",
    tags: [],
    domainsVirtual: [],
    workspaceId: null,
    ...overrides,
  }) as DashboardProject;

describe("searchProjects", () => {
  test.each([
    ["id", "83e97c09dcce", { id: "d845c167-ea07-4875-b08d-83e97c09dcce" }],
    ["title", "Marketing", { title: "Marketing Site" }],
    ["domain", "docs", { domain: "docs" }],
    [
      "custom domain",
      "client.example.com",
      {
        domainsVirtual: [
          { domain: "client.example.com", status: "ACTIVE", verified: true },
        ],
      },
    ],
    [
      "latest build id",
      "aca9e9574587",
      {
        latestBuildVirtual: {
          buildId: "f565d527-32e7-4731-bc71-aca9e9574587",
          projectId: "project-1",
          domainsVirtualId: "",
          domain: "fixture",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
          publishStatus: "PUBLISHED",
        },
      },
    ],
  ] satisfies Array<[string, string, Partial<DashboardProject>]>)(
    "matches projects by %s",
    (_field, search, overrides) => {
      const projects = [
        createProject(overrides),
        createProject({ id: "project-other", title: "Other Project" }),
      ];

      expect(searchProjects(projects, search)).toEqual([projects[0]]);
    }
  );

  test("does not return projects without matching fields", () => {
    const projects = [
      createProject({ title: "Marketing Site" }),
      createProject({ title: "Other Project" }),
    ];

    expect(searchProjects(projects, "missing")).toEqual([]);
  });
});
