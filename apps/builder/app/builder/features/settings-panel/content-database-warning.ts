import { assetQueryResult } from "@webstudio-is/sdk";

export const getContentDatabasePreviewWarning = (value: unknown) => {
  if (
    typeof value !== "object" ||
    value === null ||
    "data" in value === false
  ) {
    return;
  }
  const result = assetQueryResult.safeParse(value.data);
  const database = result.success ? result.data.database : undefined;
  if (database?.truncated !== true) {
    return;
  }
  const total = database.includedDocumentCount + database.omittedDocumentCount;
  return `The content database includes ${database.includedDocumentCount} of ${total} files within the ${Math.ceil(database.maxBytes / 1024)} KiB limit. Published query results may omit ${database.omittedDocumentCount} files.`;
};
