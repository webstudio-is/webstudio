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
