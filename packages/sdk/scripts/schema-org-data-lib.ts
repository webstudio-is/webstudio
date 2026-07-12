import Papa from "papaparse";

const schemaOrgBase = "https://schema.org/";

export type SchemaOrgTypeRow = readonly [
  name: string,
  parentTypes: readonly string[],
  supersededBy: string,
];

export type SchemaOrgPropertyRow = readonly [
  name: string,
  domains: readonly string[],
  ranges: readonly string[],
  supersededBy: string,
];

const compareCodePoints = (left: string, right: string) =>
  left < right ? -1 : left > right ? 1 : 0;

const parseCsv = (name: string, csv: string) => {
  const result = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
  });
  if (result.errors.length > 0) {
    throw Error(
      `Unable to parse Schema.org ${name}: ${result.errors[0].message}`
    );
  }
  return result.data;
};

const term = (value: string) =>
  value.startsWith(schemaOrgBase) ? value.slice(schemaOrgBase.length) : value;

const terms = (value = "") =>
  value
    .split(",")
    .map((item) => term(item.trim()))
    .filter(Boolean)
    .sort(compareCodePoints);

export const createSchemaOrgData = ({
  typesCsv,
  propertiesCsv,
}: {
  typesCsv: string;
  propertiesCsv: string;
}) => {
  const typeRows = parseCsv("types", typesCsv)
    .map(
      (row) =>
        [
          term(row.id),
          terms(row.subTypeOf),
          term(row.supersededBy ?? ""),
        ] as const
    )
    .filter(([name]) => name !== "")
    .sort(([left], [right]) => compareCodePoints(left, right));

  const propertyRows = parseCsv("properties", propertiesCsv)
    .map(
      (row) =>
        [
          term(row.id),
          terms(row.domainIncludes),
          terms(row.rangeIncludes),
          term(row.supersededBy ?? ""),
        ] as const
    )
    .filter(([name]) => name !== "")
    .sort(([left], [right]) => compareCodePoints(left, right));

  return { typeRows, propertyRows };
};
