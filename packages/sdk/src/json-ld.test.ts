import { expect, test } from "vitest";
import { hasTopLevelJsonLdContext, parseJsonLd } from "./json-ld";
import { validateJsonLdWithSchemaOrg } from "./schema-org";

test("parses JSON-LD objects and arrays", () => {
  expect(parseJsonLd('{"@context":"https://schema.org"}')).toEqual({
    success: true,
    value: { "@context": "https://schema.org" },
  });
  expect(parseJsonLd([{ "@type": "Organization" }]).success).toBe(true);
});

test.each(["invalid", '"text"', "1", "null", undefined])(
  "rejects non-object JSON-LD %j",
  (value) => {
    expect(parseJsonLd(value)).toEqual({ success: false });
  }
);

test("rejects values that cannot be represented as JSON", () => {
  const cyclic: Record<string, unknown> = {};
  cyclic.self = cyclic;

  for (const value of [
    new Date(),
    new Map(),
    { nested: undefined },
    { nested: () => undefined },
    { nested: Number.NaN },
    cyclic,
  ]) {
    expect(parseJsonLd(value)).toEqual({ success: false });
  }
});

test("detects context on objects and top-level array entries", () => {
  expect(hasTopLevelJsonLdContext({ "@context": "https://schema.org" })).toBe(
    true
  );
  expect(hasTopLevelJsonLdContext([{ "@context": "https://schema.org" }])).toBe(
    true
  );
  expect(hasTopLevelJsonLdContext({ "@type": "Organization" })).toBe(false);
});

test("validates JSON-LD keyword shapes", () => {
  expect(
    validateJsonLdWithSchemaOrg({
      "@context": "https://schema.org",
      "@type": 1,
      "@id": {},
    })
  ).toMatchObject({
    success: false,
    diagnostics: expect.arrayContaining([
      expect.objectContaining({
        severity: "error",
        code: "invalid-keyword-value",
        path: '$["@type"]',
      }),
      expect.objectContaining({
        severity: "error",
        code: "invalid-keyword-value",
        path: '$["@id"]',
      }),
    ]),
  });
  expect(validateJsonLdWithSchemaOrg(["not a node"])).toMatchObject({
    success: false,
    diagnostics: [
      expect.objectContaining({ code: "invalid-root", path: "$[0]" }),
    ],
  });
});

test("validates nested, reverse, and nullable language keyword shapes", () => {
  expect(
    validateJsonLdWithSchemaOrg({
      "@context": "https://schema.org",
      "@nest": { name: "Acme" },
      "@reverse": { parentOrganization: { "@id": "https://example.com" } },
      description: { "@value": "Description", "@language": null },
    })
  ).toMatchObject({ success: true });
  expect(
    validateJsonLdWithSchemaOrg({
      "@context": "https://schema.org",
      "@nest": "name",
      "@reverse": [],
    })
  ).toMatchObject({
    success: false,
    diagnostics: expect.arrayContaining([
      expect.objectContaining({
        code: "invalid-keyword-value",
        path: '$["@nest"]',
      }),
      expect.objectContaining({
        code: "invalid-keyword-value",
        path: '$["@reverse"]',
      }),
    ]),
  });
});

test("accepts known Schema.org types and inherited properties", () => {
  expect(
    validateJsonLdWithSchemaOrg({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Acme",
      url: "https://example.com",
      sameAs: ["https://social.example/acme"],
    })
  ).toEqual({
    success: true,
    value: {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Acme",
      url: "https://example.com",
      sameAs: ["https://social.example/acme"],
    },
    diagnostics: [],
  });
});

test("accepts full Schema.org IRIs and does not judge custom type IRIs", () => {
  expect(
    validateJsonLdWithSchemaOrg({
      "@context": "https://schema.org",
      "@type": [
        "https://schema.org/Organization",
        "https://example.com/CustomType",
      ],
      name: "Acme",
    }).diagnostics
  ).toEqual([]);
});

test("accepts primitive JSON-LD list values", () => {
  expect(
    validateJsonLdWithSchemaOrg({
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: {
        "@list": ["One", "Two"],
      },
    }).diagnostics
  ).toEqual([]);
});

test("accepts JSON-LD 1.1 JSON literals", () => {
  expect(
    validateJsonLdWithSchemaOrg({
      "@context": "https://schema.org",
      subjectOf: {
        "@value": { theme: "dark", flags: ["a", "b"] },
        "@type": "@json",
      },
    }).diagnostics
  ).toEqual([]);
});

test("resolves mixed contexts, custom term overrides, and prefixes", () => {
  expect(
    validateJsonLdWithSchemaOrg({
      "@context": [
        "https://schema.org",
        {
          customField: "https://example.com/customField",
          name: "https://example.com/name",
        },
      ],
      "@type": "Organization",
      name: "Custom vocabulary name",
      customField: "value",
    }).diagnostics
  ).toEqual([]);

  expect(
    validateJsonLdWithSchemaOrg({
      "@context": { schema: "https://schema.org/" },
      "@type": "schema:Organization",
      "schema:name": "Acme",
    }).diagnostics
  ).toEqual([]);
});

test("validates common JSON-LD context keyword types", () => {
  expect(
    validateJsonLdWithSchemaOrg({
      "@context": { "@vocab": 1, "@propagate": "yes" },
    })
  ).toMatchObject({
    success: false,
    diagnostics: expect.arrayContaining([
      expect.objectContaining({ code: "invalid-context" }),
    ]),
  });
});

test("rejects primitive JSON-LD context term definitions", () => {
  expect(
    validateJsonLdWithSchemaOrg({
      "@context": {
        name: 1,
        enabled: true,
        valid: "https://example.com/valid",
      },
      "@type": "Thing",
    })
  ).toMatchObject({
    success: false,
    diagnostics: expect.arrayContaining([
      expect.objectContaining({
        code: "invalid-context",
        path: '$["@context"].name',
      }),
      expect.objectContaining({
        code: "invalid-context",
        path: '$["@context"].enabled',
      }),
    ]),
  });
});

test("allows a nested context to reset the inherited Schema.org vocabulary", () => {
  expect(
    validateJsonLdWithSchemaOrg({
      "@context": "https://schema.org",
      "@type": "Organization",
      subjectOf: {
        "@context": null,
        "@type": "CustomType",
        customProperty: true,
      },
    }).diagnostics
  ).toEqual([]);
});

test("warns about unknown, deprecated, unsupported, and incompatible Schema.org terms", () => {
  const result = validateJsonLdWithSchemaOrg({
    "@context": "https://schema.org",
    "@type": ["Organization", "UnknownBusiness"],
    awards: "Award",
    recipeCategory: "Dinner",
    madeUpProperty: true,
    numberOfEmployees: "many",
    isAccessibleForFree: "yes",
  });
  expect(result.success).toBe(true);
  expect(result.diagnostics).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ code: "unknown-schema-org-type" }),
      expect.objectContaining({ code: "deprecated-schema-org-property" }),
      expect.objectContaining({ code: "unsupported-schema-org-property" }),
      expect.objectContaining({ code: "unknown-schema-org-property" }),
      expect.objectContaining({ code: "incompatible-schema-org-value" }),
    ])
  );
});

test("does not apply Schema.org vocabulary warnings to custom contexts", () => {
  expect(
    validateJsonLdWithSchemaOrg({
      "@context": "https://example.com/context",
      "@type": "CustomType",
      customProperty: "value",
    }).diagnostics
  ).toEqual([]);
});
