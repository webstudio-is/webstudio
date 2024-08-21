export const getRequestOrigin = (request: Request) => {
  const url = new URL(request.url);

  // Vercel overwrites x-forwarded-host at the edge level, even if our header is set.
  // We use custom header x-forwarded-ws-host to get the original host as a workaround.
  url.host =
    request.headers.get("x-forwarded-ws-host") ??
    request.headers.get("x-forwarded-host") ??
    url.host;
  url.protocol = request.headers.get("x-forwarded-proto") ?? "https";
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

  fragments[0] = fragments[0].replace(re, "");

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

export function getAuthorizationServerOrigin(request: Request): string;
export function getAuthorizationServerOrigin(origin: string): string;

// eslint-disable-next-line func-style
export function getAuthorizationServerOrigin(
  request: string | Request
): string {
  const origin =
    typeof request === "string"
      ? new URL(request).origin
      : getRequestOrigin(request);
  const { sourceOrigin } = parseBuilderUrl(origin);
  return sourceOrigin;
}
