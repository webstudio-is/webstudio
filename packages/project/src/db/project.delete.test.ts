import { describe, expect, test, vi } from "vitest";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import { softDeleteProject } from "./project";

describe("softDeleteProject publish reports", () => {
  test("does not delete reports when the project update fails", async () => {
    const deletePublishReports = vi.fn();
    const error = new Error("project update failed");
    const context = {
      postgrest: {
        client: {
          from: () => ({
            update: () => ({ eq: async () => ({ error }) }),
          }),
        },
      },
      deployment: {
        deploymentTrpc: {
          deletePublishReports: { mutate: deletePublishReports },
        },
      },
    } as unknown as AppContext;

    await expect(softDeleteProject("project-1", context)).rejects.toThrow(
      "project update failed"
    );
    expect(deletePublishReports).not.toHaveBeenCalled();
  });

  test("deletes every retained report in bounded pages after deletion", async () => {
    const rows = Array.from({ length: 1001 }, (_, index) => ({
      id: `attempt-${index}`,
      retentionDays: index % 2 === 0 ? 1 : 30,
    }));
    const deletePublishReports = vi.fn().mockResolvedValue({ success: true });
    const context = {
      postgrest: {
        client: {
          from: (relation: string) => {
            if (relation === "Project") {
              return {
                update: () => ({
                  eq: async () => ({ error: null }),
                }),
              };
            }
            return {
              select: () => ({
                eq: () => ({
                  order: () => ({
                    range: async (from: number, to: number) => ({
                      data: rows.slice(from, to + 1),
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          },
        },
      },
      deployment: {
        deploymentTrpc: {
          deletePublishReports: { mutate: deletePublishReports },
        },
      },
    } as unknown as AppContext;

    await softDeleteProject("project-1", context);

    expect(deletePublishReports).toHaveBeenCalledTimes(2);
    expect(deletePublishReports.mock.calls[0][0].reports).toHaveLength(1000);
    expect(deletePublishReports.mock.calls[1][0].reports).toHaveLength(1);
  });
});
