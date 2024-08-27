export const getRequestOrigin = (urlStr: string) => {
  const url = new URL(urlStr);

  return url.origin;
};

export const isCanvas = (urlStr: string): boolean => {
  const url = new URL(urlStr);
  const projectId = url.searchParams.get("projectId");

  return projectId !== null;
};

// For easier detecting the builder URL
const buildProjectDomainPrefix = "p-";

export const parseBuilderUrl = (urlStr: string) => {
  const url = new URL(urlStr);

  const fragments = url.host.split(".");
  // Regular expression to match the prefix, UUID, and any optional string after '-dot-'
  const re =
    /^(?<prefix>[a-z-]+)(?<uuid>[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})(-dot-(?<branch>.*))?/;
  const match = fragments[0].match(re);

  // Extract prefix, projectId (UUID), and branch (if exists)
  const prefix = match?.groups?.prefix;
  const projectId = match?.groups?.uuid;
  const branch = match?.groups?.branch;

  if (prefix !== buildProjectDomainPrefix) {
    return {
      projectId: undefined,
      sourceOrigin: url.origin,
    };
  }

  if (projectId === undefined) {
    return {
      projectId: undefined,
      sourceOrigin: url.origin,
    };
  }

  fragments[0] = fragments[0].replace(re, branch ?? "");

  const sourceUrl = new URL(url.origin);
  sourceUrl.protocol = "https";
  sourceUrl.host = fragments.filter(Boolean).join(".");

  return {
    projectId,
    sourceOrigin: sourceUrl.origin,
  };
};

export const isBuilderUrl = (urlStr: string): boolean => {
  const { projectId } = parseBuilderUrl(urlStr);
  return projectId !== undefined;
};

export const getAuthorizationServerOrigin = (urlStr: string): string => {
  const origin = getRequestOrigin(urlStr);
  const { sourceOrigin } = parseBuilderUrl(origin);
  return sourceOrigin;
};
