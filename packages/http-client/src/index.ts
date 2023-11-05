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
    updatedAt: string;
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

export const loadProjectDataById = async (params: {
  projectId: string;
  origin: string;
  authToken?: string;
}): Promise<Data> => {
  const result = await getLatestBuildUsingProjectId(params);
  if (result.buildId === null) {
    throw new Error(`The project is not published yet`);
  }

  const url = new URL(params.origin);
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

export const loadProjectDataByBuildId = async (params: {
  buildId: string;
  origin: string;
  authToken: string;
}): Promise<Data> => {
  const url = new URL(params.origin);
  url.pathname = `/rest/build/${params.buildId}`;

  const response = await fetch(url.href, {
    headers: {
      Authorization: params.authToken,
    },
  });

  if (response.ok) {
    return await response.json();
  }

  const message = await response.text();
  throw new Error(message.slice(0, 1000));
};

// @todo: broken as expects non 200 code
export const getLatestBuildUsingProjectId = async (params: {
  projectId: string;
  origin: string;
  authToken?: string;
}): Promise<{ buildId: string | null }> => {
  const { origin, projectId, authToken } = params;
  const url = new URL(origin);
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
