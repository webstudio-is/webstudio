import { describe, expect, test, vi } from "vitest";
import type { Asset } from "./schema/assets";
import {
  filterAssetResource,
  loadAssetResource,
  maxAssetResourceContentBytes,
  maxAssetResourceContentItems,
  toAssetResourceItem,
} from "./asset-resource";

const fileAsset = ({
  id,
  filename,
  format,
  size = 10,
}: {
  id: string;
  filename: string;
  format: string;
  size?: number;
}): Asset => ({
  id,
  projectId: "project",
  name: `${id}.${format}`,
  filename,
  type: "file",
  format,
  size,
  createdAt: "2026-07-20T00:00:00.000Z",
  meta: {},
});

const assets = Object.fromEntries(
  [
    fileAsset({ id: "readme", filename: "Readme.md", format: "md" }),
    fileAsset({ id: "settings", filename: "settings.json", format: "json" }),
    fileAsset({ id: "notes", filename: "release-notes.txt", format: "txt" }),
  ].map((asset) => [
    asset.id,
    toAssetResourceItem(asset, "https://example.com"),
  ])
);

describe("asset resource", () => {
  test("filters by filename and one or more extensions", () => {
    expect(
      Object.keys(
        filterAssetResource(
          assets,
          new URLSearchParams({ filename: "set", extension: ".json,md" })
        )
      )
    ).toEqual(["settings"]);
  });

  test("includes text and parsed JSON content", async () => {
    const fetchAsset = vi.fn(
      async (url: string) =>
        new Response(url.includes("settings") ? '{"theme":"dark"}' : "# Readme")
    );

    await expect(
      loadAssetResource({
        assets,
        requestUrl: "/$resources/assets?extension=md,json&include=content",
        fetchAsset,
      })
    ).resolves.toMatchObject({
      readme: { content: "# Readme" },
      settings: { content: { theme: "dark" } },
    });
  });

  test("reports invalid JSON without losing its source text", async () => {
    await expect(
      loadAssetResource({
        assets: { settings: assets.settings! },
        requestUrl: "/$resources/assets?include=content",
        fetchAsset: async () => new Response("{invalid"),
      })
    ).resolves.toMatchObject({
      settings: {
        content: "{invalid",
        contentError: "Asset contains invalid JSON.",
      },
    });
  });

  test("bounds content by asset size and match count", async () => {
    const oversized = toAssetResourceItem(
      fileAsset({
        id: "large",
        filename: "large.md",
        format: "md",
        size: maxAssetResourceContentBytes + 1,
      }),
      "https://example.com"
    );
    const fetchAsset = vi.fn(async () => new Response("unused"));
    await expect(
      loadAssetResource({
        assets: { large: oversized },
        requestUrl: "/$resources/assets?include=content",
        fetchAsset,
      })
    ).resolves.toMatchObject({
      large: { contentError: expect.stringContaining("exceeds") },
    });
    expect(fetchAsset).not.toHaveBeenCalled();

    const tooMany = Object.fromEntries(
      Array.from({ length: maxAssetResourceContentItems + 1 }, (_, index) => [
        String(index),
        assets.readme!,
      ])
    );
    await expect(
      loadAssetResource({
        assets: tooMany,
        requestUrl: "/$resources/assets?include=content",
        fetchAsset,
      })
    ).rejects.toThrow(`at most ${maxAssetResourceContentItems}`);
  });

  test("does not fetch binary asset content", async () => {
    const binary = toAssetResourceItem(
      fileAsset({
        id: "document",
        filename: "document.pdf",
        format: "pdf",
      }),
      "https://example.com"
    );
    const fetchAsset = vi.fn(async () => new Response("unused"));

    await expect(
      loadAssetResource({
        assets: { document: binary },
        requestUrl: "/$resources/assets?include=content",
        fetchAsset,
      })
    ).resolves.toMatchObject({
      document: { contentError: "Asset format is not editable text." },
    });
    expect(fetchAsset).not.toHaveBeenCalled();
  });
});
