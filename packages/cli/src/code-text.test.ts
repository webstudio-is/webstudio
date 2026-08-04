import { expect, test } from "vitest";
import type { Instances, Props, WsComponentMeta } from "@webstudio-is/sdk";
import { collectCodeTextAssets } from "./code-text";

const meta = {
  props: {
    language: {
      required: true,
      control: "select",
      type: "string",
      options: ["plaintext", "javascript"],
    },
    theme: {
      required: true,
      control: "select",
      type: "string",
      options: ["github-light", "nord"],
    },
  },
} satisfies WsComponentMeta;

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

const collect = (props: Props) =>
  collectCodeTextAssets({ instances, props, meta });

test("collects the deduplicated union of configured Code Text assets", () => {
  const props = new Map([
    [
      "code-1-language",
      {
        id: "code-1-language",
        instanceId: "code-1",
        name: "language",
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
      "code-2-language",
      {
        id: "code-2-language",
        instanceId: "code-2",
        name: "language",
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

  expect(collect(props)).toEqual({
    staticLanguages: ["javascript"],
    staticThemes: ["github-light", "nord"],
    dynamicLanguages: false,
    dynamicThemes: false,
  });
});

test("keeps legacy Code Text instances on the plain renderer", () => {
  expect(collect(new Map())).toBeUndefined();
});

test("keeps legacy HTML language instances on the plain renderer", () => {
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

  expect(collect(props)).toBeUndefined();
});

test("rejects incomplete highlighting selections", () => {
  const props = new Map([
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

  expect(() => collect(props)).toThrow(
    'Code Text "code-1" requires both Language and Theme selections.'
  );
});

test("marks expression-bound selections as dynamic", () => {
  const props = new Map([
    [
      "code-1-language",
      {
        id: "code-1-language",
        instanceId: "code-1",
        name: "language",
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

  expect(collect(props)).toEqual({
    staticLanguages: [],
    staticThemes: ["github-light"],
    dynamicLanguages: true,
    dynamicThemes: false,
  });
});

test("rejects selections outside the component metadata", () => {
  const props = new Map([
    [
      "code-1-language",
      {
        id: "code-1-language",
        instanceId: "code-1",
        name: "language",
        type: "string" as const,
        value: "ruby",
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

  expect(() => collect(props)).toThrow(
    'Code Text "code-1" has an unsupported language selection "ruby".'
  );
});
