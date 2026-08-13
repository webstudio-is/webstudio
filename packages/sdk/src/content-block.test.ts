import { describe, expect, test } from "vitest";
import { allocateUniqueContentBlockTemplateName } from "./content-block";

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
