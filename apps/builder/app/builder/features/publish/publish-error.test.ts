import { describe, expect, test } from "vitest";
import { TRPCClientError } from "@trpc/client";
import {
  getPublishResponseTransformDiagnostics,
  getPublishValidationErrorMessage,
  publishValidationTimeoutMessage,
} from "./publish-error";

describe("getPublishResponseTransformDiagnostics", () => {
  test("keeps response diagnostics shape-only and allowlists headers", () => {
    const secret = "private-response-and-auth-sentinel";
    const response = new Response(secret, {
      status: 502,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "x-vercel-id": "iad1::request-id",
        authorization: secret,
      },
    });
    const error = TRPCClientError.from(
      new Error("Unable to transform response from server"),
      {
        meta: {
          response,
          responseJSON: [
            { result: { data: secret } },
            { error: { message: secret } },
          ],
        },
      }
    );

    const diagnostics = getPublishResponseTransformDiagnostics(error);

    expect(diagnostics).toEqual({
      status: 502,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "x-vercel-id": "iad1::request-id",
      },
      responseJson: {
        present: true,
        batchSize: 2,
        envelopes: ["result", "error"],
      },
    });
    expect(JSON.stringify(diagnostics)).not.toContain(secret);
  });

  test("does not report unrelated errors", () => {
    expect(
      getPublishResponseTransformDiagnostics(new Error("request failed"))
    ).toBeUndefined();
  });
});

describe("getPublishValidationErrorMessage", () => {
  test("describes a gateway timeout in terms of the publish flow", () => {
    const response = new Response("<!DOCTYPE html>", {
      status: 504,
      headers: { "content-type": "text/html" },
    });
    const error = TRPCClientError.from(
      new SyntaxError("Unexpected token '<'"),
      { meta: { response } }
    );

    expect(getPublishValidationErrorMessage(error)).toBe(
      publishValidationTimeoutMessage
    );
  });

  test("recognizes the Vercel timeout code", () => {
    const response = new Response("Timed out", {
      status: 500,
      headers: { "x-vercel-error": "FUNCTION_INVOCATION_TIMEOUT" },
    });
    const error = TRPCClientError.from(new SyntaxError("Unexpected token"), {
      meta: {
        response,
      },
    });

    expect(getPublishValidationErrorMessage(error)).toBe(
      publishValidationTimeoutMessage
    );
  });

  test("locates a linked asset and points users to Webstudio MCP", () => {
    const error = new Error("Document asset-id could not be loaded");
    const asset = {
      id: "asset-id",
      filename: "article",
      format: "md",
      name: "article-storage.md",
      folderId: "authors",
    };
    const folder = {
      id: "authors",
      name: "authors",
      parentId: "blog",
      projectId: "project-id",
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    const parentFolder = {
      id: "blog",
      name: "blog",
      projectId: "project-id",
      createdAt: "2026-01-01T00:00:00.000Z",
    };

    expect(
      getPublishValidationErrorMessage(error, {
        assets: new Map([[asset.id, asset]]) as never,
        assetFolders: new Map([
          [folder.id, folder],
          [parentFolder.id, parentFolder],
        ]) as never,
      })
    ).toContain(
      "Publish validation couldn’t read “article.md” in Content Assets > blog > authors."
    );
    const message = getPublishValidationErrorMessage(error, {
      assets: new Map([[asset.id, asset]]) as never,
      assetFolders: new Map([
        [folder.id, folder],
        [parentFolder.id, parentFolder],
      ]) as never,
    });
    expect(message).toContain("https://wstd.us/mcp");
    expect(message).toContain("Document ID: asset-id");
    expect(message).not.toContain("contact Webstudio support");
  });

  test("includes the document ID and MCP link when asset metadata is unavailable", () => {
    const message = getPublishValidationErrorMessage(
      new Error("Document asset-id could not be loaded")
    );

    expect(message).toContain("https://wstd.us/mcp");
    expect(message).toContain("Document ID: asset-id");
  });
});
