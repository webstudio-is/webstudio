import { z } from "zod";

/**
 * A Webstudio data envelope is a serialized single-key object whose key is a
 * versioned Webstudio data marker, for example
 * `{ "@webstudio/instance/v0.1": data }`.
 *
 * The envelope is transport-agnostic. Runtime only validates the envelope and
 * returns the domain transfer data inside it.
 */
type DataEnvelopeSchemas = readonly (readonly [string, z.ZodTypeAny])[];

type DataEnvelopeValidResult<Schemas extends DataEnvelopeSchemas> = {
  [Index in keyof Schemas]: Schemas[Index] extends readonly [
    infer Version extends string,
    infer Schema extends z.ZodTypeAny,
  ]
    ? { owned: true; valid: true; version: Version; data: z.output<Schema> }
    : never;
}[number];

export type DataEnvelopeParseResult<Schemas extends DataEnvelopeSchemas> =
  | { owned: false; valid: false }
  | { owned: true; valid: false }
  | DataEnvelopeValidResult<Schemas>;

const ownsDataEnvelope = (serializedData: string, versions: string[]) => {
  const data = serializedData.trimStart();
  const objectContent =
    data.startsWith("{") === false ? undefined : data.slice(1).trimStart();
  if (
    objectContent !== undefined &&
    versions.some((version) => objectContent.startsWith(`"${version}"`))
  ) {
    return true;
  }
  try {
    const data = JSON.parse(serializedData);
    return (
      data != null &&
      typeof data === "object" &&
      versions.some((version) => version in data)
    );
  } catch {
    return false;
  }
};

export const parseDataEnvelope = <Schemas extends DataEnvelopeSchemas>({
  serializedData,
  schemas,
}: {
  serializedData: string;
  schemas: Schemas;
}): DataEnvelopeParseResult<Schemas> => {
  const versions = schemas.map(([version]) => version);
  const owned = ownsDataEnvelope(serializedData, versions);
  if (owned === false) {
    return { owned: false, valid: false };
  }
  try {
    const data = JSON.parse(serializedData);
    if (data == null || typeof data !== "object") {
      return { owned: true, valid: false };
    }
    for (const [version, schema] of schemas) {
      const result = schema.safeParse(
        (data as Record<string, unknown>)[version]
      );
      if (result.success) {
        return {
          owned: true,
          valid: true,
          version,
          data: result.data,
        } as DataEnvelopeValidResult<Schemas>;
      }
    }
  } catch {
    return { owned: true, valid: false };
  }
  return { owned: true, valid: false };
};
