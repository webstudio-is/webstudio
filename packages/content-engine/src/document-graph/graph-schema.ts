import { enum as zEnum, strictObject, string } from "zod";
import { documentFormats } from "./document-format";
import { documentReference } from "./reference";

export const documentGraphNodeSchema = strictObject({
  id: string().min(1),
  revision: string().min(1),
  contentRef: string().min(1),
  format: zEnum(documentFormats).optional(),
});

export const documentGraphEdgeSchema = strictObject({
  sourceId: string().min(1),
  referenceId: string().min(1),
  reference: documentReference,
});
