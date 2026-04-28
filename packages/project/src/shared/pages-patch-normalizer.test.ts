import { describe, expect, test } from "vitest";
import { enableMapSet, type Patch } from "immer";
import type { Pages } from "@webstudio-is/sdk";
import {
  normalizePagesPatch,
  denormalizePagesPatch,
  type PagesPatchChange,
} from "./pages-patch-normalizer";

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
  patches: Patch[],
  revisePatches: Patch[] = []
): PagesPatchChange => ({ namespace, patches, revisePatches });

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

  test("encodes folder id from value for add op", () => {
    const pages = makePages([], [{ id: "f1", name: "Root" }]);
    const newFolder = {
      id: "f2",
      name: "Blog",
      slug: "blog",
      children: [],
    };
    const changes = [
      makeChange("pages", [
        { op: "add", path: ["folders", 1], value: newFolder },
      ]),
    ];
    const result = normalizePagesPatch(changes, pages);
    expect(result[0].patches[0].path).toEqual(["folders", "@f2"]);
    expect(result[0].patches[0].value).toEqual(newFolder);
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

  test("encodes folder id from revise patch value for remove op", () => {
    const pages = makePages(
      [],
      [
        { id: "f1", name: "Root" },
        { id: "f2", name: "Blog" },
      ]
    );
    const removedFolder = {
      id: "f2",
      name: "Blog",
      slug: "blog",
      children: [],
    };
    const changes = [
      makeChange(
        "pages",
        [{ op: "remove", path: ["folders", 1] }],
        [{ op: "add", path: ["folders", 1], value: removedFolder }]
      ),
    ];
    const result = normalizePagesPatch(changes, pages);
    expect(result[0].patches[0].path).toEqual(["folders", "@f2"]);
  });

  test("uses current item id for nested add", () => {
    const pages = makePages([
      { id: "p1", name: "About" },
      { id: "p2", name: "Contact" },
    ]);
    const changes = [
      makeChange("pages", [
        {
          op: "add",
          path: ["pages", 1, "meta", "custom", 0],
          value: { property: "og:title", content: "Contact" },
        },
      ]),
    ];
    const result = normalizePagesPatch(changes, pages);
    expect(result[0].patches[0].path).toEqual([
      "pages",
      "@p2",
      "meta",
      "custom",
      0,
    ]);
  });

  test("uses current item id for nested remove", () => {
    const pages = makePages([
      { id: "p1", name: "About" },
      { id: "p2", name: "Contact" },
    ]);
    const changes = [
      makeChange(
        "pages",
        [{ op: "remove", path: ["pages", 1, "meta", "custom", 0] }],
        [
          {
            op: "add",
            path: ["pages", 1, "meta", "custom", 0],
            value: { property: "og:title", content: "Contact" },
          },
        ]
      ),
    ];
    const result = normalizePagesPatch(changes, pages);
    expect(result[0].patches[0].path).toEqual([
      "pages",
      "@p2",
      "meta",
      "custom",
      0,
    ]);
  });

  test("uses current folder id for nested children updates", () => {
    const pages = makePages([], [{ id: "folder", name: "Folder" }]);
    const changes = [
      makeChange("pages", [
        {
          op: "add",
          path: ["folders", 0, "children", 0],
          value: "page-id",
        },
      ]),
    ];
    const result = normalizePagesPatch(changes, pages);
    expect(result[0].patches[0].path).toEqual([
      "folders",
      "@folder",
      "children",
      0,
    ]);
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
    expect(result[0].revisePatches?.[0]?.path).toEqual([
      "pages",
      "@p2",
      "name",
    ]);
  });

  test("normalizes revise remove for top-level add", () => {
    const pages = makePages([{ id: "p1", name: "About" }]);
    const newPage = {
      id: "p2",
      name: "New",
      path: "/new",
      title: "New",
      meta: {},
    };
    const changes = [
      makeChange(
        "pages",
        [{ op: "add", path: ["pages", 1], value: newPage }],
        [{ op: "remove", path: ["pages", 1] }]
      ),
    ];
    const result = normalizePagesPatch(changes, pages);
    expect(result[0].patches[0].path).toEqual(["pages", "@p2"]);
    expect(result[0].revisePatches?.[0]?.path).toEqual(["pages", "@p2"]);
  });

  test("preserves missing revise patches", () => {
    const pages = makePages([{ id: "p1", name: "About" }]);
    const changes = [
      {
        namespace: "pages",
        patches: [
          { op: "replace", path: ["pages", 0, "name"], value: "Updated" },
        ],
      },
    ] as PagesPatchChange[];
    const result = normalizePagesPatch(changes, pages);
    expect(result[0].patches[0].path).toEqual(["pages", "@p1", "name"]);
    expect("revisePatches" in result[0]).toBe(false);
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

  test("uses append-to-end index for folder add op", () => {
    const pages = makePages([], [{ id: "f1", name: "Root" }]);
    const newFolder = {
      id: "f2",
      name: "Blog",
      slug: "blog",
      children: [],
    };
    const changes = [
      makeChange("pages", [
        { op: "add", path: ["folders", "@f2"], value: newFolder },
      ]),
    ];
    const result = denormalizePagesPatch(changes, pages);
    expect(result[0].patches[0].path).toEqual(["folders", 1]);
  });

  test("uses sequential append indexes for multiple add ops", () => {
    const pages = makePages([{ id: "p1", name: "About" }]);
    const page2 = {
      id: "p2",
      name: "New",
      path: "/new",
      title: "New",
      meta: {},
    };
    const page3 = {
      id: "p3",
      name: "Other",
      path: "/other",
      title: "Other",
      meta: {},
    };
    const changes = [
      makeChange("pages", [
        { op: "add", path: ["pages", "@p2"], value: page2 },
        { op: "add", path: ["pages", "@p3"], value: page3 },
      ]),
    ];
    const result = denormalizePagesPatch(changes, pages);
    expect(result[0].patches[0].path).toEqual(["pages", 1]);
    expect(result[0].patches[1].path).toEqual(["pages", 2]);
  });

  test("resolves nested patches for items added in the same change", () => {
    const pages = makePages([{ id: "p1", name: "About" }]);
    const page2 = {
      id: "p2",
      name: "New",
      path: "/new",
      title: "New",
      meta: {},
    };
    const changes = [
      makeChange("pages", [
        { op: "add", path: ["pages", "@p2"], value: page2 },
        { op: "replace", path: ["pages", "@p2", "name"], value: "Updated" },
      ]),
    ];
    const result = denormalizePagesPatch(changes, pages);
    expect(result[0].patches[0].path).toEqual(["pages", 1]);
    expect(result[0].patches[1].path).toEqual(["pages", 1, "name"]);
  });

  test("converts encoded page id back to current index for remove op", () => {
    const pages = makePages([
      { id: "p1", name: "About" },
      { id: "p2", name: "Contact" },
    ]);
    const changes = [
      makeChange("pages", [{ op: "remove", path: ["pages", "@p2"] }]),
    ];
    const result = denormalizePagesPatch(changes, pages);
    expect(result[0].patches[0].path).toEqual(["pages", 1]);
  });

  test("resolves nested add to existing page index instead of appending", () => {
    const pages = makePages([
      { id: "p1", name: "About" },
      { id: "p2", name: "Contact" },
    ]);
    const changes = [
      makeChange("pages", [
        {
          op: "add",
          path: ["pages", "@p2", "meta", "custom", 0],
          value: { property: "og:title", content: "Contact" },
        },
      ]),
    ];
    const result = denormalizePagesPatch(changes, pages);
    expect(result[0].patches[0].path).toEqual([
      "pages",
      1,
      "meta",
      "custom",
      0,
    ]);
  });

  test("resolves nested remove to existing page index", () => {
    const pages = makePages([
      { id: "p1", name: "About" },
      { id: "p2", name: "Contact" },
    ]);
    const changes = [
      makeChange("pages", [
        { op: "remove", path: ["pages", "@p2", "meta", "custom", 0] },
      ]),
    ];
    const result = denormalizePagesPatch(changes, pages);
    expect(result[0].patches[0].path).toEqual([
      "pages",
      1,
      "meta",
      "custom",
      0,
    ]);
  });

  test("denormalizes broadcast patches without revise patches", () => {
    const pages = makePages([{ id: "p1", name: "About" }]);
    const newPage = {
      id: "p2",
      name: "New",
      path: "/new",
      title: "New",
      meta: {},
    };
    const changes = [
      {
        namespace: "pages",
        patches: [{ op: "add", path: ["pages", "@p2"], value: newPage }],
      },
    ] as PagesPatchChange[];
    const result = denormalizePagesPatch(changes, pages);
    expect(result[0].patches[0].path).toEqual(["pages", 1]);
    expect("revisePatches" in result[0]).toBe(false);
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

  test("throws when page id is missing and onMissing is throw", () => {
    const pages = makePages([{ id: "p1", name: "About" }]);
    const changes = [
      makeChange("pages", [
        { op: "replace", path: ["pages", "@deleted", "name"], value: "X" },
      ]),
    ];
    expect(() =>
      denormalizePagesPatch(changes, pages, { onMissing: "throw" })
    ).toThrow('Unable to apply pages patch. Item "deleted" was not found.');
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
    const original: PagesPatchChange[] = [
      makeChange(
        "pages",
        [{ op: "replace", path: ["pages", 1, "name"], value: "Updated" }],
        [{ op: "replace", path: ["pages", 1, "name"], value: "Contact" }]
      ),
    ];
    const normalized = normalizePagesPatch(original, pages);
    const restored = denormalizePagesPatch(normalized, pages);
    expect(restored[0].patches[0].path).toEqual(original[0].patches[0].path);
    expect(restored[0].revisePatches?.[0]?.path).toEqual(
      original[0].revisePatches?.[0]?.path
    );
  });

  test("roundtrip: normalize then denormalize is identity for top-level add", () => {
    const pages = makePages([{ id: "p1", name: "About" }]);
    const newPage = {
      id: "p2",
      name: "New",
      path: "/new",
      title: "New",
      meta: {},
    };
    const original: PagesPatchChange[] = [
      makeChange(
        "pages",
        [{ op: "add", path: ["pages", 1], value: newPage }],
        [{ op: "remove", path: ["pages", 1] }]
      ),
    ];
    const normalized = normalizePagesPatch(original, pages);
    const restored = denormalizePagesPatch(normalized, pages);
    expect(restored[0].patches[0].path).toEqual(original[0].patches[0].path);
    expect(restored[0].revisePatches?.[0]?.path).toEqual(
      original[0].revisePatches?.[0]?.path
    );
  });
});
