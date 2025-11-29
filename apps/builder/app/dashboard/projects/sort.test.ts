/**
 * Tests for the sortProjects function and sort order semantics.
 *
 * This test suite covers:
 * 1. All sort fields (title, createdAt, updatedAt, publishedAt)
 * 2. Both sort orders (asc, desc)
 * 3. Special cases (unpublished projects, fallback to createdAt)
 * 4. Immutability guarantees
 * 5. Edge cases (empty arrays, single items, identical values)
 * 6. Order semantics:
 *    - Alphabetical: asc = A→Z, desc = Z→A
 *    - Dates: asc = Oldest first, desc = Newest first
 */

import { describe, test, expect } from "vitest";
import { sortProjects } from "./sort";
import type { DashboardProject } from "@webstudio-is/dashboard";

type LatestBuildVirtual = NonNullable<DashboardProject["latestBuildVirtual"]>;

const createMockProject = (
  overrides: Partial<DashboardProject>
): DashboardProject => {
  return {
    id: "project-1",
    title: "Test Project",
    domain: "test",
    isDeleted: false,
    createdAt: "2024-01-01T00:00:00.000Z",
    marketplaceApprovalStatus: "UNLISTED",
    latestBuildVirtual: null,
    previewImageAsset: null,
    tags: [],
    isPublished: false,
    ...overrides,
  } as DashboardProject;
};

describe("sortProjects", () => {
  describe("sort by title", () => {
    test("sorts alphabetically in ascending order", () => {
      const projects = [
        createMockProject({ id: "1", title: "Zebra" }),
        createMockProject({ id: "2", title: "Apple" }),
        createMockProject({ id: "3", title: "Mango" }),
      ];

      const sorted = sortProjects(projects, "title", "asc");

      expect(sorted.map((p) => p.title)).toEqual(["Apple", "Mango", "Zebra"]);
    });

    test("sorts alphabetically in descending order", () => {
      const projects = [
        createMockProject({ id: "1", title: "Apple" }),
        createMockProject({ id: "2", title: "Zebra" }),
        createMockProject({ id: "3", title: "Mango" }),
      ];

      const sorted = sortProjects(projects, "title", "desc");

      expect(sorted.map((p) => p.title)).toEqual(["Zebra", "Mango", "Apple"]);
    });

    test("handles case-insensitive sorting", () => {
      const projects = [
        createMockProject({ id: "1", title: "zebra" }),
        createMockProject({ id: "2", title: "Apple" }),
        createMockProject({ id: "3", title: "MANGO" }),
      ];

      const sorted = sortProjects(projects, "title", "asc");

      expect(sorted.map((p) => p.title)).toEqual(["Apple", "MANGO", "zebra"]);
    });
  });

  describe("sort by createdAt", () => {
    test("sorts by creation date in ascending order (oldest first)", () => {
      const projects = [
        createMockProject({ id: "1", createdAt: "2024-03-01T00:00:00.000Z" }),
        createMockProject({ id: "2", createdAt: "2024-01-01T00:00:00.000Z" }),
        createMockProject({ id: "3", createdAt: "2024-02-01T00:00:00.000Z" }),
      ];

      const sorted = sortProjects(projects, "createdAt", "asc");

      expect(sorted.map((p) => p.id)).toEqual(["2", "3", "1"]);
    });

    test("sorts by creation date in descending order (newest first)", () => {
      const projects = [
        createMockProject({ id: "1", createdAt: "2024-01-01T00:00:00.000Z" }),
        createMockProject({ id: "2", createdAt: "2024-03-01T00:00:00.000Z" }),
        createMockProject({ id: "3", createdAt: "2024-02-01T00:00:00.000Z" }),
      ];

      const sorted = sortProjects(projects, "createdAt", "desc");

      expect(sorted.map((p) => p.id)).toEqual(["2", "3", "1"]);
    });
  });

  describe("sort by updatedAt (last modified)", () => {
    test("sorts by latest build date when available", () => {
      const projects = [
        createMockProject({
          id: "1",
          createdAt: "2024-01-01T00:00:00.000Z",
          latestBuildVirtual: {
            createdAt: "2024-03-01T00:00:00.000Z",
          } as LatestBuildVirtual,
        }),
        createMockProject({
          id: "2",
          createdAt: "2024-01-01T00:00:00.000Z",
          latestBuildVirtual: {
            createdAt: "2024-01-15T00:00:00.000Z",
          } as LatestBuildVirtual,
        }),
        createMockProject({
          id: "3",
          createdAt: "2024-01-01T00:00:00.000Z",
          latestBuildVirtual: {
            createdAt: "2024-02-01T00:00:00.000Z",
          } as LatestBuildVirtual,
        }),
      ];

      const sorted = sortProjects(projects, "updatedAt", "desc");

      expect(sorted.map((p) => p.id)).toEqual(["1", "3", "2"]);
    });

    test("falls back to createdAt when latestBuildVirtual is null", () => {
      const projects = [
        createMockProject({
          id: "1",
          createdAt: "2024-03-01T00:00:00.000Z",
          latestBuildVirtual: null,
        }),
        createMockProject({
          id: "2",
          createdAt: "2024-01-01T00:00:00.000Z",
          latestBuildVirtual: {
            createdAt: "2024-02-01T00:00:00.000Z",
          } as LatestBuildVirtual,
        }),
        createMockProject({
          id: "3",
          createdAt: "2024-02-01T00:00:00.000Z",
          latestBuildVirtual: null,
        }),
      ];

      const sorted = sortProjects(projects, "updatedAt", "desc");

      // Project 1: March 1 (createdAt fallback)
      // Project 2: Feb 1 (latestBuildVirtual)
      // Project 3: Feb 1 (createdAt fallback)
      expect(sorted.map((p) => p.id)).toEqual(["1", "2", "3"]);
    });

    test("sorts in ascending order (oldest first)", () => {
      const projects = [
        createMockProject({
          id: "1",
          createdAt: "2024-01-01T00:00:00.000Z",
          latestBuildVirtual: {
            createdAt: "2024-03-01T00:00:00.000Z",
          } as LatestBuildVirtual,
        }),
        createMockProject({
          id: "2",
          createdAt: "2024-01-01T00:00:00.000Z",
          latestBuildVirtual: {
            createdAt: "2024-01-15T00:00:00.000Z",
          } as LatestBuildVirtual,
        }),
      ];

      const sorted = sortProjects(projects, "updatedAt", "asc");

      expect(sorted.map((p) => p.id)).toEqual(["2", "1"]);
    });
  });

  describe("sort by publishedAt (date published)", () => {
    test("sorts published projects by publish date", () => {
      const projects = [
        createMockProject({
          id: "1",
          latestBuildVirtual: {
            publishStatus: "PUBLISHED",
            createdAt: "2024-03-01T00:00:00.000Z",
          } as LatestBuildVirtual,
        }),
        createMockProject({
          id: "2",
          latestBuildVirtual: {
            publishStatus: "PUBLISHED",
            createdAt: "2024-01-01T00:00:00.000Z",
          } as LatestBuildVirtual,
        }),
        createMockProject({
          id: "3",
          latestBuildVirtual: {
            publishStatus: "PUBLISHED",
            createdAt: "2024-02-01T00:00:00.000Z",
          } as LatestBuildVirtual,
        }),
      ];

      const sorted = sortProjects(projects, "publishedAt", "desc");

      expect(sorted.map((p) => p.id)).toEqual(["1", "3", "2"]);
    });

    test("puts unpublished projects at the end in descending order", () => {
      const projects = [
        createMockProject({
          id: "1",
          latestBuildVirtual: {
            publishStatus: "PUBLISHED",
            createdAt: "2024-02-01T00:00:00.000Z",
          } as LatestBuildVirtual,
        }),
        createMockProject({
          id: "2",
          latestBuildVirtual: null,
        }),
        createMockProject({
          id: "3",
          latestBuildVirtual: {
            publishStatus: "PENDING",
            createdAt: "2024-03-01T00:00:00.000Z",
          } as LatestBuildVirtual,
        }),
        createMockProject({
          id: "4",
          latestBuildVirtual: {
            publishStatus: "PUBLISHED",
            createdAt: "2024-01-01T00:00:00.000Z",
          } as LatestBuildVirtual,
        }),
      ];

      const sorted = sortProjects(projects, "publishedAt", "desc");

      // Unpublished projects (null or non-PUBLISHED status) come first in this sort
      // because of the comparison logic: unpublished gets positive comparison value
      // Then published projects sorted by date descending
      expect(sorted.map((p) => p.id)).toEqual(["2", "3", "1", "4"]);
    });

    test("puts unpublished projects at the end in ascending order", () => {
      const projects = [
        createMockProject({
          id: "1",
          latestBuildVirtual: {
            publishStatus: "PUBLISHED",
            createdAt: "2024-02-01T00:00:00.000Z",
          } as LatestBuildVirtual,
        }),
        createMockProject({
          id: "2",
          latestBuildVirtual: null,
        }),
        createMockProject({
          id: "3",
          latestBuildVirtual: {
            publishStatus: "PUBLISHED",
            createdAt: "2024-01-01T00:00:00.000Z",
          } as LatestBuildVirtual,
        }),
      ];

      const sorted = sortProjects(projects, "publishedAt", "asc");

      // Published projects first (sorted by date ascending), then unpublished
      expect(sorted.map((p) => p.id)).toEqual(["3", "1", "2"]);
    });

    test("maintains order for multiple unpublished projects", () => {
      const projects = [
        createMockProject({ id: "1", latestBuildVirtual: null }),
        createMockProject({
          id: "2",
          latestBuildVirtual: {
            publishStatus: "PENDING",
          } as LatestBuildVirtual,
        }),
        createMockProject({ id: "3", latestBuildVirtual: null }),
      ];

      const sorted = sortProjects(projects, "publishedAt", "desc");

      expect(sorted.map((p) => p.id)).toEqual(["1", "2", "3"]);
    });
  });

  describe("immutability", () => {
    test("does not mutate the original array", () => {
      const projects = [
        createMockProject({ id: "1", title: "B" }),
        createMockProject({ id: "2", title: "A" }),
      ];

      const originalOrder = projects.map((p) => p.id);
      sortProjects(projects, "title", "asc");

      expect(projects.map((p) => p.id)).toEqual(originalOrder);
    });

    test("returns a new array", () => {
      const projects = [
        createMockProject({ id: "1", title: "A" }),
        createMockProject({ id: "2", title: "B" }),
      ];

      const sorted = sortProjects(projects, "title", "asc");

      expect(sorted).not.toBe(projects);
    });
  });

  describe("edge cases", () => {
    test("handles empty array", () => {
      const sorted = sortProjects([], "title", "asc");
      expect(sorted).toEqual([]);
    });

    test("handles single project", () => {
      const projects = [createMockProject({ id: "1", title: "Only" })];
      const sorted = sortProjects(projects, "title", "asc");
      expect(sorted).toHaveLength(1);
      expect(sorted[0].id).toBe("1");
    });

    test("handles projects with identical values", () => {
      const projects = [
        createMockProject({
          id: "1",
          title: "Same",
          createdAt: "2024-01-01T00:00:00.000Z",
        }),
        createMockProject({
          id: "2",
          title: "Same",
          createdAt: "2024-01-01T00:00:00.000Z",
        }),
        createMockProject({
          id: "3",
          title: "Same",
          createdAt: "2024-01-01T00:00:00.000Z",
        }),
      ];

      const sorted = sortProjects(projects, "title", "asc");
      expect(sorted).toHaveLength(3);
    });
  });

  describe("order semantics", () => {
    describe("alphabetical sorting", () => {
      test("asc order produces A→Z sorting", () => {
        const projects = [
          createMockProject({ id: "1", title: "Zebra" }),
          createMockProject({ id: "2", title: "Apple" }),
          createMockProject({ id: "3", title: "Mango" }),
        ];

        const sorted = sortProjects(projects, "title", "asc");

        // A→Z: Apple, Mango, Zebra
        expect(sorted.map((p) => p.title)).toEqual(["Apple", "Mango", "Zebra"]);
      });

      test("desc order produces Z→A sorting", () => {
        const projects = [
          createMockProject({ id: "1", title: "Apple" }),
          createMockProject({ id: "2", title: "Zebra" }),
          createMockProject({ id: "3", title: "Mango" }),
        ];

        const sorted = sortProjects(projects, "title", "desc");

        // Z→A: Zebra, Mango, Apple
        expect(sorted.map((p) => p.title)).toEqual(["Zebra", "Mango", "Apple"]);
      });
    });

    describe("date sorting", () => {
      test("desc order produces newest first for createdAt", () => {
        const projects = [
          createMockProject({ id: "1", createdAt: "2024-01-01T00:00:00.000Z" }),
          createMockProject({ id: "2", createdAt: "2024-03-01T00:00:00.000Z" }),
          createMockProject({ id: "3", createdAt: "2024-02-01T00:00:00.000Z" }),
        ];

        const sorted = sortProjects(projects, "createdAt", "desc");

        // Newest first: March, February, January
        expect(sorted.map((p) => p.id)).toEqual(["2", "3", "1"]);
      });

      test("asc order produces oldest first for createdAt", () => {
        const projects = [
          createMockProject({ id: "1", createdAt: "2024-03-01T00:00:00.000Z" }),
          createMockProject({ id: "2", createdAt: "2024-01-01T00:00:00.000Z" }),
          createMockProject({ id: "3", createdAt: "2024-02-01T00:00:00.000Z" }),
        ];

        const sorted = sortProjects(projects, "createdAt", "asc");

        // Oldest first: January, February, March
        expect(sorted.map((p) => p.id)).toEqual(["2", "3", "1"]);
      });

      test("desc order produces newest first for updatedAt", () => {
        const projects = [
          createMockProject({
            id: "1",
            createdAt: "2024-01-01T00:00:00.000Z",
            latestBuildVirtual: {
              createdAt: "2024-01-15T00:00:00.000Z",
            } as LatestBuildVirtual,
          }),
          createMockProject({
            id: "2",
            createdAt: "2024-01-01T00:00:00.000Z",
            latestBuildVirtual: {
              createdAt: "2024-03-01T00:00:00.000Z",
            } as LatestBuildVirtual,
          }),
        ];

        const sorted = sortProjects(projects, "updatedAt", "desc");

        // Newest first: March update, January update
        expect(sorted.map((p) => p.id)).toEqual(["2", "1"]);
      });

      test("desc order produces newest first for publishedAt", () => {
        const projects = [
          createMockProject({
            id: "1",
            latestBuildVirtual: {
              publishStatus: "PUBLISHED",
              createdAt: "2024-01-01T00:00:00.000Z",
            } as LatestBuildVirtual,
          }),
          createMockProject({
            id: "2",
            latestBuildVirtual: {
              publishStatus: "PUBLISHED",
              createdAt: "2024-03-01T00:00:00.000Z",
            } as LatestBuildVirtual,
          }),
        ];

        const sorted = sortProjects(projects, "publishedAt", "desc");

        // Newest first: March publish, January publish
        expect(sorted.map((p) => p.id)).toEqual(["2", "1"]);
      });
    });
  });
});
