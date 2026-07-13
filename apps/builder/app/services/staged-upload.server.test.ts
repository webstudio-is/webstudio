import { describe, expect, test } from "vitest";
import {
  maxProjectBundleSize,
  stagedUploadPath,
  stagedUploadProjectIdHeader,
} from "@webstudio-is/protocol";
import { __testing__ } from "./staged-upload.server";

const { createStagedUploadServer, createStagedUploadStore } = __testing__;

const createRequest = (headers: Record<string, string> = {}) =>
  new Request(new URL(stagedUploadPath, "https://example.com"), { headers });

const createServer = () => {
  const calls: string[] = [];
  const server = createStagedUploadServer({
    datastore: {} as never,
    createContext: async () => ({ context: true }) as never,
    assertProjectBuildPermit: async ({ ctx, projectId }) => {
      calls.push(`${projectId}:${JSON.stringify(ctx)}`);
    },
  });
  return { calls, server };
};

describe("staged upload server", () => {
  test("uses project bundle upload limits", () => {
    const { server } = createServer();

    expect(server.options.path).toBe(stagedUploadPath);
    expect(server.options.maxSize).toBe(maxProjectBundleSize);
    expect(server.options.relativeLocation).toBe(true);
    expect(server.options.allowedHeaders).toContain(
      stagedUploadProjectIdHeader
    );
  });

  test("requires auth token before accepting upload requests", async () => {
    const { server } = createServer();

    await expect(
      server.options.onIncomingRequest?.(
        createRequest({ [stagedUploadProjectIdHeader]: "project" }) as never,
        ""
      )
    ).rejects.toThrow("Auth token is required.");
  });

  test("rejects empty upload authorization headers", async () => {
    const { server } = createServer();

    await expect(
      server.options.onIncomingRequest?.(
        createRequest({
          "x-auth-token": " ",
          [stagedUploadProjectIdHeader]: "project",
        }) as never,
        ""
      )
    ).rejects.toThrow("Auth token is required.");

    await expect(
      server.options.onIncomingRequest?.(
        createRequest({
          "x-auth-token": "token",
          [stagedUploadProjectIdHeader]: " ",
        }) as never,
        ""
      )
    ).rejects.toThrow("Project id is required.");
  });

  test("checks build permission for upload requests", async () => {
    const { calls, server } = createServer();

    await server.options.onIncomingRequest?.(
      createRequest({
        "x-auth-token": "token",
        [stagedUploadProjectIdHeader]: "project",
      }) as never,
      ""
    );

    expect(calls).toEqual(['project:{"context":true}']);
  });

  test("requires upload metadata to match the request project", async () => {
    const { server } = createServer();

    await expect(
      server.options.onUploadCreate?.(
        createRequest({
          "x-auth-token": "token",
          [stagedUploadProjectIdHeader]: "project",
        }) as never,
        {
          metadata: { projectId: "other-project" },
        } as never
      )
    ).rejects.toThrow("Upload project id does not match request project id.");
  });

  test("rejects partial object storage configuration", () => {
    expect(() =>
      createStagedUploadStore({
        S3_ACCESS_KEY_ID: "",
        S3_BUCKET: undefined,
        S3_ENDPOINT: "https://example.com",
        S3_REGION: undefined,
        S3_SECRET_ACCESS_KEY: undefined,
      })
    ).toThrow(
      "Staged upload storage is missing required environment variables: S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET"
    );
  });

  test("disables object tags for S3-compatible upload storage", () => {
    const store = createStagedUploadStore({
      S3_ACCESS_KEY_ID: "access-key",
      S3_BUCKET: "bucket",
      S3_ENDPOINT: "https://example.com",
      S3_REGION: "auto",
      S3_SECRET_ACCESS_KEY: "secret-key",
    });

    expect(store).toHaveProperty("useTags", false);
  });
});
