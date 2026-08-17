import { expect, test } from "vitest";
import type { BuilderState } from "../state/builder-state";
import { applyBuilderPatchTransactions } from "../state/patch";
import { searchProject, updateProjectMatches } from "./search";

const createState = (): BuilderState => ({
  pages: {
    homePageId: "home",
    rootFolderId: "root",
    pages: new Map([
      [
        "home",
        {
          id: "home",
          name: "Home",
          path: "",
          title: "Old title",
          rootInstanceId: "body",
          meta: {},
        },
      ],
    ]),
    folders: new Map([
      ["root", { id: "root", name: "Root", slug: "", children: ["home"] }],
    ]),
  },
  instances: new Map([
    [
      "body",
      {
        type: "instance",
        id: "body",
        component: "Body",
        children: [{ type: "text", value: "Old text" }],
      },
    ],
  ]),
  props: new Map([
    [
      "hero-prop",
      {
        id: "hero-prop",
        instanceId: "body",
        name: "src",
        type: "asset",
        value: "asset-hero",
      },
    ],
  ]),
  styles: new Map(),
  styleSources: new Map(),
  styleSourceSelections: new Map(),
  dataSources: new Map(),
  resources: new Map(),
  assets: new Map([
    [
      "asset-hero",
      {
        id: "asset-hero",
        projectId: "project",
        size: 1,
        name: "hero.png",
        description: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        format: "png",
        meta: { width: 1, height: 1 },
        type: "image",
      },
    ],
  ]),
  assetFolders: new Map(),
  breakpoints: new Map(),
  projectSettings: { meta: { siteName: "Old site" }, compiler: {} },
});

test("search returns stable editable matches with route context", () => {
  const state = createState();
  const first = searchProject(state, { query: "Old", scopes: ["all"] });
  const second = searchProject(state, { query: "Old", scopes: ["all"] });

  expect(first.matches).toEqual(second.matches);
  expect(first.matches).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        entityType: "page",
        entityId: "home",
        currentValue: "Old title",
        affectedRoutes: ["/"],
        editable: true,
      }),
      expect.objectContaining({
        entityType: "text",
        entityId: "body",
        currentValue: "Old text",
        affectedRoutes: ["/"],
        editable: true,
      }),
      expect.objectContaining({
        entityType: "project-setting",
        currentValue: "Old site",
        affectedRoutes: ["*"],
        editable: true,
      }),
    ])
  );
  expect(
    searchProject(state, { query: "asset-hero", scopes: ["props"] }).matches
  ).toEqual([
    expect.objectContaining({
      entityType: "prop",
      affectedRoutes: ["/"],
      reference: {
        targetType: "asset",
        targetId: "asset-hero",
        resolved: true,
        valid: true,
      },
    }),
  ]);
});

test("updates matches across entity kinds in one transaction", () => {
  const state = createState();
  const matches = searchProject(state, {
    query: "Old",
    scopes: ["all"],
  }).matches;
  const page = matches.find((match) => match.currentValue === "Old title")!;
  const text = matches.find((match) => match.currentValue === "Old text")!;

  const mutation = updateProjectMatches(state, {
    updates: [
      {
        matchId: page.matchId,
        expectedValue: "Old title",
        value: "New title",
      },
      {
        matchId: text.matchId,
        expectedValue: "Old text",
        value: "New text",
      },
    ],
  });
  const nextState = applyBuilderPatchTransactions(state, [
    { id: "test", payload: mutation.payload },
  ]).state;

  expect(mutation.result).toMatchObject({
    changedCount: 2,
    affectedEntities: [
      { entityType: "page", entityId: "home" },
      { entityType: "text", entityId: "body" },
    ],
    affectedRoutes: ["/"],
    validation: { status: "passed" },
  });
  expect(nextState.pages?.pages.get("home")?.title).toBe("New title");
  expect(nextState.instances?.get("body")?.children[0]).toEqual({
    type: "text",
    value: "New text",
  });
});

test("rejects the complete update when one expected value is stale", () => {
  const state = createState();
  const matches = searchProject(state, {
    query: "Old",
    scopes: ["all"],
  }).matches;

  expect(() =>
    updateProjectMatches(state, {
      updates: matches.slice(0, 2).map((match, index) => ({
        matchId: match.matchId,
        expectedValue: index === 1 ? "stale" : match.currentValue,
        value: "New",
      })),
    })
  ).toThrow(/changed since search/i);
});

test("rejects a match update that introduces an unresolved reference", () => {
  const state = createState();
  const [match] = searchProject(state, {
    query: "asset-hero",
    scopes: ["props"],
  }).matches;

  expect(() =>
    updateProjectMatches(state, {
      updates: [
        {
          matchId: match.matchId,
          expectedValue: "asset-hero",
          value: "missing-asset",
        },
      ],
    })
  ).toThrow(/unresolved references/i);
});
