import { expect, test } from "vitest";
import { createSchemaOrgData } from "./schema-org-data-lib";

test("normalizes and deterministically sorts Schema.org CSV rows", () => {
  const result = createSchemaOrgData({
    typesCsv: [
      "id,subTypeOf,supersededBy",
      'https://schema.org/äType,"https://schema.org/zParent, https://schema.org/AParent",',
      "https://schema.org/AType,,https://schema.org/NewType",
    ].join("\n"),
    propertiesCsv: [
      "id,domainIncludes,rangeIncludes,supersededBy",
      'https://schema.org/zProp,"https://schema.org/ZType, https://schema.org/AType",https://schema.org/Text,',
      "https://schema.org/AProp,https://schema.org/Thing,https://schema.org/URL,https://schema.org/newProp",
    ].join("\n"),
  });

  expect(result).toEqual({
    typeRows: [
      ["AType", [], "NewType"],
      ["äType", ["AParent", "zParent"], ""],
    ],
    propertyRows: [
      ["AProp", ["Thing"], ["URL"], "newProp"],
      ["zProp", ["AType", "ZType"], ["Text"], ""],
    ],
  });
});

test("rejects malformed CSV input", () => {
  expect(() =>
    createSchemaOrgData({
      typesCsv: 'id,subTypeOf\n"unterminated',
      propertiesCsv: "id,domainIncludes,rangeIncludes,supersededBy",
    })
  ).toThrow("Unable to parse Schema.org types");
});
