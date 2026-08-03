import { expect, test } from "vitest";
import type { Instances, Props } from "@webstudio-is/sdk";
import { collectCodeTextAssets } from "./code-text";

const instances = new Map([
  [
    "code-1",
    {
      type: "instance" as const,
      id: "code-1",
      component: "CodeText",
      children: [],
    },
  ],
  [
    "code-2",
    {
      type: "instance" as const,
      id: "code-2",
      component: "CodeText",
      children: [],
    },
  ],
]) satisfies Instances;

test("collects the deduplicated union of configured Code Text assets", () => {
  const props = new Map([
    [
      "code-1-lang",
      {
        id: "code-1-lang",
        instanceId: "code-1",
        name: "lang",
        type: "string" as const,
        value: "javascript",
      },
    ],
    [
      "code-1-theme",
      {
        id: "code-1-theme",
        instanceId: "code-1",
        name: "theme",
        type: "string" as const,
        value: "github-light",
      },
    ],
    [
      "code-2-lang",
      {
        id: "code-2-lang",
        instanceId: "code-2",
        name: "lang",
        type: "string" as const,
        value: "javascript",
      },
    ],
    [
      "code-2-theme",
      {
        id: "code-2-theme",
        instanceId: "code-2",
        name: "theme",
        type: "string" as const,
        value: "nord",
      },
    ],
  ]) satisfies Props;

  expect(collectCodeTextAssets({ instances, props })).toEqual({
    languages: ["javascript"],
    themes: ["github-light", "nord"],
  });
});

test("keeps legacy Code Text instances on the plain renderer", () => {
  expect(
    collectCodeTextAssets({ instances, props: new Map() })
  ).toBeUndefined();
});

test("keeps legacy language-only instances on the plain renderer", () => {
  const props = new Map([
    [
      "code-1-lang",
      {
        id: "code-1-lang",
        instanceId: "code-1",
        name: "lang",
        type: "string" as const,
        value: "javascript",
      },
    ],
  ]) satisfies Props;

  expect(collectCodeTextAssets({ instances, props })).toBeUndefined();
});

test("rejects expression-bound selections", () => {
  const props = new Map([
    [
      "code-1-lang",
      {
        id: "code-1-lang",
        instanceId: "code-1",
        name: "lang",
        type: "expression" as const,
        value: '"javascript"',
      },
    ],
    [
      "code-1-theme",
      {
        id: "code-1-theme",
        instanceId: "code-1",
        name: "theme",
        type: "string" as const,
        value: "github-light",
      },
    ],
  ]) satisfies Props;

  expect(() => collectCodeTextAssets({ instances, props })).toThrow(
    'Code Text "code-1" Language must be a fixed selection.'
  );
});
