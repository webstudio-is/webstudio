import { describe, expect, test } from "vitest";
import { enableMapSet } from "immer";
import type { Pages } from "@webstudio-is/sdk";
import {
  normalizePagesPatch,
  denormalizePagesPatch,
} from "./pages-patch-normalizer";
import type { Change } from "immerhin";

enableMapSet();

const makePages = (
  pages: Array<{ id: string; name: string }> = [],
  folders: Array<{ id: string; name: string }> = []
): Pages =>
  ({
    homePage: {
      id: "home",
      name: "Home",
      path: "",
      title: "Home",
      meta: {},
    } as Pages["homePage"],
    pages: pages.map((p) => ({
      ...p,
      path: `/${p.name.toLowerCase()}`,
      title: p.name,
      meta: {},
    })) as Pages["pages"],
    folders: folders.map((f) => ({
      ...f,
      slug: f.name.toLowerCase(),
      children: [],
    })) as Pages["folders"],
  }) satisfies Pages;

const makeChange = (
  namespace: string,
  patches: Change["patches"],
  revisePatches: Change["revisePatches"] = []
): Change => ({ namespace, patches, revisePatches });

//  normalizePagesPatch

describe("normalizePagesPatch", () => {
  test("replaces numeric index with encoded page id for replace op", () => {
    const pages = makePages([
      { id: "p1", name: "About" },
      { id: "p2", name: "Contact" },
    ]);
    const changes = [
      makeChange("pages", [
        { op: "replace", path: ["pages", 1, "name"], value: "Updated" },
      ]),
    ];
    const result = normalizePagesPatch(changes, pages);
    expect(result[0].patches[0].path).toEqual(["pages", "@p2", "name"]);
  });

  test("replaces numeric index with encoded folder id for replace op", () => {
    const pages = makePages([], [{ id: "f1", name: "Blog" }]);
    const changes = [
      makeChange("pages", [
        { op: "replace", path: ["folders", 0, "slug"], value: "news" },
      ]),
    ];
    const result = normalizePagesPatch(changes, pages);
    expect(result[0].patches[0].path).toEqual(["folders", "@f1", "slug"]);
  });

  test("encodes id from value for add op", () => {
    const pages = makePages([{ id: "p1", name: "About" }]);
    const newPage = {
      id: "p2",
      name: "New",
      path: "/new",
      title: "New",
      meta: {},
    };
    const changes = [
      makeChange("pages", [{ op: "add", path: ["pages", 1], value: newPage }]),
    ];
    const result = normalizePagesPatch(changes, pages);
    expect(result[0].patches[0].path).toEqual(["pages", "@p2"]);
    expect(result[0].patches[0].value).toEqual(newPage);
  });

  test("encodes id from revise patch value for remove op", () => {
    const pages = makePages([
      { id: "p1", name: "About" },
      { id: "p2", name: "Contact" },
    ]);
    const removedPage = {
      id: "p2",
      name: "Contact",
      path: "/contact",
      title: "Contact",
      meta: {},
    };
    const changes = [
      makeChange(
        "pages",
        [{ op: "remove", path: ["pages", 1] }],
        [{ op: "add", path: ["pages", 1], value: removedPage }]
      ),
    ];
    const result = normalizePagesPatch(changes, pages);
    expect(result[0].patches[0].path).toEqual(["pages", "@p2"]);
  });

  test("leaves non-pages namespace unchanged", () => {
    const pages = makePages([{ id: "p1", name: "About" }]);
    const changes = [
      makeChange("instances", [
        { op: "replace", path: [0, "type"], value: "div" },
      ]),
    ];
    const result = normalizePagesPatch(changes, pages);
    expect(result[0].patches[0].path).toEqual([0, "type"]);
  });

  test("leaves already-string-indexed path unchanged", () => {
    const pages = makePages([{ id: "p1", name: "About" }]);
    const changes = [
      makeChange("pages", [
        { op: "replace", path: ["homePage", "name"], value: "Home" },
      ]),
    ];
    const result = normalizePagesPatch(changes, pages);
    expect(result[0].patches[0].path).toEqual(["homePage", "name"]);
  });

  test("normalizes revise patches symmetrically", () => {
    const pages = makePages([
      { id: "p1", name: "About" },
      { id: "p2", name: "Contact" },
    ]);
    const changes = [
      makeChange(
        "pages",
        [{ op: "replace", path: ["pages", 1, "name"], value: "Updated" }],
        [{ op: "replace", path: ["pages", 1, "name"], value: "Contact" }]
      ),
    ];
    const result = normalizePagesPatch(changes, pages);
    expect(result[0].revisePatches[0].path).toEqual(["pages", "@p2", "name"]);
  });
});

//  denormalizePagesPatch

describe("denormalizePagesPatch", () => {
  test("converts encoded page id back to current index", () => {
    const pages = makePages([
      { id: "p1", name: "About" },
      { id: "p2", name: "Contact" },
    ]);
    const changes = [
      makeChange("pages", [
        { op: "replace", path: ["pages", "@p2", "name"], value: "Updated" },
      ]),
    ];
    const result = denormalizePagesPatch(changes, pages);
    expect(result[0].patches[0].path).toEqual(["pages", 1, "name"]);
  });

  test("converts to current index even when order differs from sender", () => {
    // Receiver has reversed order vs sender
    const pages = makePages([
      { id: "p2", name: "Contact" },
      { id: "p1", name: "About" },
    ]);
    const changes = [
      makeChange("pages", [
        { op: "replace", path: ["pages", "@p1", "name"], value: "Updated" },
      ]),
    ];
    const result = denormalizePagesPatch(changes, pages);
    expect(result[0].patches[0].path).toEqual(["pages", 1, "name"]);
  });

  test("uses append-to-end index for add op", () => {
    const pages = makePages([{ id: "p1", name: "About" }]);
    const newPage = {
      id: "p2",
      name: "New",
      path: "/new",
      title: "New",
      meta: {},
    };
    const changes = [
      makeChange("pages", [
        { op: "add", path: ["pages", "@p2"], value: newPage },
      ]),
    ];
    const result = denormalizePagesPatch(changes, pages);
    expect(result[0].patches[0].path).toEqual(["pages", 1]);
  });

  test("leaves path unchanged when page id not found (stale patch)", () => {
    const pages = makePages([{ id: "p1", name: "About" }]);
    const changes = [
      makeChange("pages", [
        { op: "replace", path: ["pages", "@deleted", "name"], value: "X" },
      ]),
    ];
    const result = denormalizePagesPatch(changes, pages);
    // Unchanged - Immer applyPatches will fail gracefully and leader drops it
    expect(result[0].patches[0].path).toEqual(["pages", "@deleted", "name"]);
  });

  test("leaves non-pages namespace unchanged", () => {
    const pages = makePages([]);
    const changes = [
      makeChange("instances", [
        { op: "replace", path: ["@some-id", "type"], value: "div" },
      ]),
    ];
    const result = denormalizePagesPatch(changes, pages);
    expect(result[0].patches[0].path).toEqual(["@some-id", "type"]);
  });

  test("roundtrip: normalize then denormalize is identity for replace", () => {
    const pages = makePages([
      { id: "p1", name: "About" },
      { id: "p2", name: "Contact" },
    ]);
    const original: Change[] = [
      makeChange(
        "pages",
        [{ op: "replace", path: ["pages", 1, "name"], value: "Updated" }],
        [{ op: "replace", path: ["pages", 1, "name"], value: "Contact" }]
      ),
    ];
    const normalized = normalizePagesPatch(original, pages);
    const restored = denormalizePagesPatch(normalized, pages);
    expect(restored[0].patches[0].path).toEqual(original[0].patches[0].path);
    expect(restored[0].revisePatches[0].path).toEqual(
      original[0].revisePatches[0].path
    );
  });
});
