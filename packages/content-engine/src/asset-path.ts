// Asset and folder names are user data, not filesystem paths. Encode each name
// independently so slashes and dot segments cannot change path structure while
// preserving the original name in the document for display and exact matching.
export const encodeAssetPathSegment = (segment: string) => {
  const encoded = encodeURIComponent(segment);
  if (encoded === ".") {
    return "%2E";
  }
  if (encoded === "..") {
    return "%2E%2E";
  }
  return encoded;
};

export const createCanonicalAssetPath = ({
  folderNames,
  name,
}: {
  folderNames: readonly string[];
  name: string;
}) => [...folderNames, name].map(encodeAssetPathSegment).join("/");

/**
 * Converts a visible asset path to its canonical form while accepting an
 * already encoded canonical path. A valid percent escape is interpreted as
 * encoded input; a literal percent escape must therefore use its canonical
 * `%25` spelling. Processing each slash-delimited segment preserves encoded
 * slashes as data instead of turning them into path separators.
 */
export const normalizeAssetPathQueryValue = (path: string) =>
  path
    .split("/")
    .map((segment) => {
      try {
        return encodeAssetPathSegment(decodeURIComponent(segment));
      } catch {
        return encodeAssetPathSegment(segment);
      }
    })
    .join("/");
