import { describe, expect, test } from "vitest";
import { blockComponent } from "./core-metas";
import type { FileAsset } from "./schema/assets";
import type { Instance } from "./schema/instances";
import type { Prop } from "./schema/props";
import {
  allocateUniqueContentBlockTemplateName,
  getContentBlockSourceIntegrityIssues,
  parseContentBlockSourceProp,
} from "./content-block";

const block: Instance = {
  type: "instance",
  id: "block",
  component: blockComponent,
  children: [],
};

const sourceProp = (values: Partial<Prop> = {}): Prop =>
  ({
    id: "source-prop",
    instanceId: block.id,
    name: "src",
    type: "asset",
    value: "post",
    ...values,
  }) as Prop;

const mdxAsset: FileAsset = {
  id: "post",
  projectId: "project",
  type: "file",
  name: "post_hash.mdx",
  filename: "post",
  format: "mdx",
  size: 1,
  meta: {},
  description: null,
  createdAt: "2026-08-14T00:00:00.000Z",
};

describe("Content Block source", () => {
  test("keeps the source optional for existing Content Blocks", () => {
    expect(
      getContentBlockSourceIntegrityIssues({
        instances: [block],
        props: [],
        assets: [],
      })
    ).toEqual([]);
  });

  test("maps persisted Asset and expression props to the source contract", () => {
    expect(parseContentBlockSourceProp(sourceProp())).toEqual({
      type: "asset",
      assetId: "post",
    });
    expect(
      parseContentBlockSourceProp(
        sourceProp({ type: "expression", value: "post.body" })
      )
    ).toEqual({ type: "expression", value: "post.body" });
    expect(
      parseContentBlockSourceProp(sourceProp({ type: "string", value: "post" }))
    ).toBeUndefined();
  });

  test("diagnoses duplicate, invalid, missing, and incompatible sources", () => {
    expect(
      getContentBlockSourceIntegrityIssues({
        instances: [block],
        props: [sourceProp(), sourceProp({ id: "other-source" })],
        assets: [mdxAsset],
      })
    ).toEqual([
      {
        type: "duplicateContentBlockSource",
        blockInstanceId: "block",
        propIds: ["source-prop", "other-source"],
      },
    ]);
    expect(
      getContentBlockSourceIntegrityIssues({
        instances: [block],
        props: [sourceProp({ type: "string" })],
        assets: [mdxAsset],
      })
    ).toEqual([
      {
        type: "invalidContentBlockSource",
        blockInstanceId: "block",
        propId: "source-prop",
        propType: "string",
      },
    ]);
    expect(
      getContentBlockSourceIntegrityIssues({
        instances: [block],
        props: [sourceProp()],
        assets: [],
      })
    ).toEqual([
      {
        type: "missingContentBlockSourceAsset",
        blockInstanceId: "block",
        propId: "source-prop",
        assetId: "post",
      },
    ]);
    expect(
      getContentBlockSourceIntegrityIssues({
        instances: [block],
        props: [sourceProp()],
        assets: [{ ...mdxAsset, name: "post_hash.md", format: "md" }],
      })
    ).toEqual([
      {
        type: "incompatibleContentBlockSourceAsset",
        blockInstanceId: "block",
        propId: "source-prop",
        assetId: "post",
        assetName: "post_hash.md",
      },
    ]);
    expect(
      getContentBlockSourceIntegrityIssues({
        instances: [block],
        props: [sourceProp()],
        assets: [mdxAsset],
      })
    ).toEqual([]);
  });
});

describe("allocateUniqueContentBlockTemplateName", () => {
  test.each([
    {
      name: "Card",
      existingNames: [],
      expected: "Card",
      reason: "keeps an unused name",
    },
    {
      name: "  Card  ",
      existingNames: [],
      expected: "Card",
      reason: "trims an unused name",
    },
    {
      name: "Card",
      existingNames: ["Card"],
      expected: "Card 2",
      reason: "adds the first suffix",
    },
    {
      name: "Card",
      existingNames: ["Card", "Card 2"],
      expected: "Card 3",
      reason: "skips a consecutive collision",
    },
    {
      name: "Card",
      existingNames: ["Card", "Card 3"],
      expected: "Card 2",
      reason: "fills the first available suffix",
    },
    {
      name: "Card 2",
      existingNames: ["Card 2"],
      expected: "Card 3",
      reason: "increments an existing suffix",
    },
    {
      name: "Card 2",
      existingNames: ["Card 2", "Card 3", "Card 5"],
      expected: "Card 4",
      reason: "fills a gap after an existing suffix",
    },
    {
      name: "Card 20",
      existingNames: ["Card 20"],
      expected: "Card 21",
      reason: "increments a multi-digit suffix",
    },
    {
      name: "Card 1",
      existingNames: ["Card 1"],
      expected: "Card 1 2",
      reason: "treats one as part of the base name",
    },
    {
      name: "Card 0",
      existingNames: ["Card 0"],
      expected: "Card 0 2",
      reason: "treats zero as part of the base name",
    },
    {
      name: "Card -2",
      existingNames: ["Card -2"],
      expected: "Card -2 2",
      reason: "does not interpret a negative suffix",
    },
    {
      name: "Card 2.5",
      existingNames: ["Card 2.5"],
      expected: "Card 2.5 2",
      reason: "does not interpret a decimal suffix",
    },
    {
      name: "Card 9007199254740992",
      existingNames: ["Card 9007199254740992"],
      expected: "Card 9007199254740992 2",
      reason: "does not increment an unsafe integer suffix",
    },
    {
      name: "Card 9007199254740991",
      existingNames: ["Card 9007199254740991"],
      expected: "Card 9007199254740991 2",
      reason: "does not increment past the safe integer range",
    },
    {
      name: "Card 9007199254740990",
      existingNames: ["Card 9007199254740990", "Card 9007199254740991"],
      expected: "Card 9007199254740991 2",
      reason: "falls back after colliding at the safe integer boundary",
    },
    {
      name: "Card 02",
      existingNames: ["Card 02"],
      expected: "Card 3",
      reason: "normalizes an incremented numeric suffix",
    },
    {
      name: "card",
      existingNames: ["Card"],
      expected: "card",
      reason: "matches names case-sensitively",
    },
    {
      name: "Héro 🦸",
      existingNames: ["Héro 🦸"],
      expected: "Héro 🦸 2",
      reason: "preserves Unicode names",
    },
  ])("$reason", ({ name, existingNames, expected }) => {
    const names = new Set(existingNames);

    expect(
      allocateUniqueContentBlockTemplateName({
        name,
        existingNames: names,
      })
    ).toBe(expected);
    expect(names).toEqual(new Set(existingNames));
  });
});
