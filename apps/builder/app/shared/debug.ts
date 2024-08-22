import createDebugRaw from "debug";

const getModuleName = (url: string) => {
  const nameParts = url.split("/").pop()?.split(".") ?? [];
  if (nameParts?.length === 0) {
    return "unknown";
  }

  const knownExtensions = ["ts", "tsx", "js", "jsx"];

  if (knownExtensions.includes(nameParts[nameParts.length - 1])) {
    nameParts.pop();
  }

  return nameParts.join(".");
};

export const createDebug = (namespaceOrUrl: string) =>
  createDebugRaw("ws").extend(getModuleName(namespaceOrUrl));
