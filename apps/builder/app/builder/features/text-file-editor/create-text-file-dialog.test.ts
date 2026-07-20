import { expect, test } from "vitest";
import type { Asset } from "@webstudio-is/sdk";
import { getTextFileNameError } from "./create-text-file-dialog";

const existing: Asset = {
  id: "existing",
  projectId: "project",
  name: "readme_hash.md",
  folderId: "docs",
  type: "file",
  format: "md",
  size: 0,
  createdAt: "2026-07-20T00:00:00.000Z",
  meta: {},
};

test("accepts supported text names and rejects invalid or duplicate names", () => {
  expect(
    getTextFileNameError({ name: "data.json", assets: [existing] })
  ).toBeUndefined();
  expect(getTextFileNameError({ name: "image.png", assets: [] })).toBe(
    "Use a supported editable text extension."
  );
  expect(getTextFileNameError({ name: ".md", assets: [] })).toBe(
    "Use a supported editable text extension."
  );
  expect(getTextFileNameError({ name: "bad/name.md", assets: [] })).toBe(
    "Enter a valid file name."
  );
  expect(
    getTextFileNameError({
      name: "readme.md",
      assets: [existing],
    })
  ).toBe("A file with this name already exists.");
});

test("compares global complete display names after an asset is renamed", () => {
  expect(
    getTextFileNameError({
      name: "guide.md",
      assets: [{ ...existing, filename: "guide", folderId: "other" }],
    })
  ).toBe("A file with this name already exists.");
});
