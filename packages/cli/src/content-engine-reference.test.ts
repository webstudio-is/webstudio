import { describe, expect, test } from "vitest";
import {
  assertContentEngineReferenceCoverage,
  structuredAssetImageRecipe,
} from "./content-engine-reference";

describe("Content Engine reference", () => {
  test("covers the schema-backed query contract", () => {
    expect(assertContentEngineReferenceCoverage).not.toThrow();
  });

  test("defines structured frontmatter image fields and bindings", () => {
    expect(structuredAssetImageRecipe).toEqual({
      frontmatter: {
        featureImage: { $ref: "./assets/hero.png" },
      },
      outputFields: [
        ["properties", "featureImage", "src"],
        ["properties", "featureImage", "description"],
      ],
      bindings: {
        src: "post.properties.featureImage.src",
        alt: "post.properties.featureImage.description ?? post.properties.title",
      },
    });
  });
});
