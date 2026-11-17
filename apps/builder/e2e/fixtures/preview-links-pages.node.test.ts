import { expect, test } from "vitest";
import { parsePreviewLinksPages } from "./preview-links-pages";

test("preserves the historical Form marker through a pages round-trip", () => {
  const pages = {
    homePageId: "home",
    rootFolderId: "root",
    pages: [
      {
        id: "home",
        name: "Home",
        title: '"Home"',
        path: "",
        rootInstanceId: "body",
        meta: {},
      },
    ],
    folders: [{ id: "root", name: "Root", slug: "", children: ["home"] }],
    formComponentIdentityVersion: 1,
  };

  expect(
    JSON.parse(
      JSON.stringify(parsePreviewLinksPages(JSON.parse(JSON.stringify(pages))))
    )
  ).toEqual(pages);
});
