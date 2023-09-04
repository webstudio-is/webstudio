import type {
  Asset,
  Breakpoint,
  DataSource,
  Deployment,
  Instance,
  Page,
  Pages,
  Prop,
  StyleDecl,
  StyleDeclKey,
  StyleSource,
  StyleSourceSelection,
} from "@webstudio-is/sdk";

export type Data = {
  page: Page;
  pages: Array<Page>;
  build: {
    id: string;
    projectId: string;
    version: number;
    createdAt: string;
    pages: Pages;
    breakpoints: [Breakpoint["id"], Breakpoint][];
    styles: [StyleDeclKey, StyleDecl][];
    styleSources: [StyleSource["id"], StyleSource][];
    styleSourceSelections: [Instance["id"], StyleSourceSelection][];
    props: [Prop["id"], Prop][];
    instances: [Instance["id"], Instance][];
    dataSources: [DataSource["id"], DataSource][];
    deployment?: Deployment | undefined;
  };
  assets: Array<Asset>;
};

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
