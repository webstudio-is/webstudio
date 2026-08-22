import { expect, test, vi } from "vitest";
import type { Asset } from "@webstudio-is/sdk";
import {
  createTextFileData,
  createTextFile,
  getTextFileNameError,
} from "./create-text-file-dialog";

const readFile = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result)));
    reader.addEventListener("error", reject);
    reader.readAsText(file);
  });

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
  expect(
    getTextFileNameError({ name: "component.mdx", assets: [] })
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

test("can restrict creation to the requested text format", () => {
  expect(
    getTextFileNameError({
      name: "post.mdx",
      assets: [],
      allowedExtensions: ["mdx"],
    })
  ).toBeUndefined();
  expect(
    getTextFileNameError({
      name: "post.md",
      assets: [],
      allowedExtensions: ["mdx"],
    })
  ).toBe("Use a supported editable text extension.");
  expect(
    getTextFileNameError({
      name: "post.MDX",
      assets: [],
      allowedExtensions: ["MDX"],
    })
  ).toBeUndefined();
  expect(
    getTextFileNameError({
      name: "post.mdx.txt",
      assets: [],
      allowedExtensions: ["mdx"],
    })
  ).toBe("Use a supported editable text extension.");
});

test("creates valid initial content for editable file types", async () => {
  const jsonFile = createTextFileData("data.json");
  if (jsonFile === undefined) {
    throw new Error("Expected JSON file data");
  }
  expect(jsonFile.name).toBe("data.json");
  expect(jsonFile.type).toBe("application/json");
  await expect(readFile(jsonFile)).resolves.toBe("{}\n");

  const markdownFile = createTextFileData("post.md");
  if (markdownFile === undefined) {
    throw new Error("Expected Markdown file data");
  }
  expect(markdownFile.type).toBe("text/markdown");
  await expect(readFile(markdownFile)).resolves.toBe("");

  expect(createTextFileData("image.png")).toBeUndefined();
});

test("creates an independent asset instead of deduplicating empty files", async () => {
  const asset = {
    ...existing,
    id: "new",
    name: "post_hash.mdx",
    format: "mdx",
  };
  const upload = vi.fn(async () => asset);

  await expect(createTextFile({ name: "post.mdx", upload })).resolves.toEqual(
    asset
  );
  expect(upload).toHaveBeenCalledOnce();
  expect(upload).toHaveBeenCalledWith(
    "file",
    expect.objectContaining({ name: "post.mdx" }),
    { folderId: undefined, deduplicate: false }
  );
});
