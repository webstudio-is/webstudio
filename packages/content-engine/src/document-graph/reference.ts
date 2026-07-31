import { array, discriminatedUnion, literal, strictObject, string } from "zod";

export const documentRepresentation = discriminatedUnion("type", [
  strictObject({ type: literal("document") }),
  strictObject({
    type: literal("json"),
    path: array(string()),
  }),
  strictObject({ type: literal("markdown-body") }),
  strictObject({ type: literal("markdown-frontmatter") }),
]);

export type DocumentRepresentation =
  | Readonly<{ type: "document" }>
  | Readonly<{ type: "json"; path: readonly string[] }>
  | Readonly<{ type: "markdown-body" }>
  | Readonly<{ type: "markdown-frontmatter" }>;

export const documentReference = strictObject({
  documentId: string().min(1),
  revision: string().min(1),
  representation: documentRepresentation,
});

export type DocumentReference = Readonly<{
  documentId: string;
  revision: string;
  representation: DocumentRepresentation;
}>;

const freezeRepresentation = (
  representation: DocumentRepresentation
): DocumentRepresentation => {
  if (representation.type === "json") {
    return Object.freeze({
      ...representation,
      path: Object.freeze([...representation.path]),
    });
  }
  return Object.freeze(representation);
};

/** Validates and freezes the storage-independent form of a document reference. */
export const createDocumentReference = (input: unknown): DocumentReference => {
  const reference = documentReference.parse(input);
  return Object.freeze({
    ...reference,
    representation: freezeRepresentation(reference.representation),
  });
};
