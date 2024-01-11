// These are the utils for manipulating "build" params.
// "Build" means user generated content — what user builds.

export type BuildParams = ({ pagePath: string } | { pageId: string }) &
  ({ projectId: string } | { projectDomain: string });

// A subtype of Request. To make testing easier.
type MinimalRequest = {
  url: string;
  headers: { get: (name: string) => string | null };
};

export const isCanvas = (request: MinimalRequest): boolean => {
  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId");

  return projectId !== null;
};
