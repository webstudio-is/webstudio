import type { Data } from "@webstudio-is/react-sdk";

interface DefaultArgs {
  host: string;
  authToken?: string;
}

type ResourceFactory<T, K> = (params: DefaultArgs & T) => Promise<K>;

export const loadProjectDataById: ResourceFactory<
  { projectId: string },
  Data
> = async (params) => {
  const result = await getLatestBuildUsingProjectId(params);
  if (result === null) {
    throw new Error(``);
  }

  const url = new URL(params.host);
  url.pathname = `/rest/build/${result.buildId}`;
  if (params.authToken) {
    url.searchParams.append("authToken", params.authToken);
  }

  const response = await fetch(url.href);

  if (response.ok) {
    return await response.json();
  }

  const message = await response.text();
  throw new Error(message.slice(0, 1000));
};

export const getLatestBuildUsingProjectId: ResourceFactory<
  { projectId: string },
  { buildId: string }
> = async (params) => {
  const { host, projectId, authToken } = params;
  const url = new URL(host);
  url.pathname = `/rest/buildId/${projectId}`;
  if (authToken) {
    url.searchParams.append("authToken", authToken);
  }
  const response = await fetch(url.href);

  if (response.ok) {
    return await response.json();
  }

  const message = await response.text();
  throw new Error(message.slice(0, 1000));
};
