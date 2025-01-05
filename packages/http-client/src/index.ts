import type {
  Asset,
  Breakpoint,
  DataSource,
  Deployment,
  Instance,
  Page,
  Pages,
  Prop,
  Resource,
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
    resources: [Resource["id"], Resource][];
    deployment?: Deployment | undefined;
  };
  assets: Array<Asset>;
  origin?: string;
};

// @todo: broken as expects non 200 code
const getLatestBuildUsingProjectId = async (params: {
  projectId: string;
  origin: string;
  authToken: string;
}): Promise<{ buildId: string | null }> => {
  const { origin, projectId, authToken } = params;

  const { sourceOrigin } = parseBuilderUrl(origin);

  const url = new URL(sourceOrigin);
  url.pathname = `/rest/buildId/${projectId}`;

  const headers = new Headers();
  headers.set("x-auth-token", authToken);

  const response = await fetch(url.href, { headers });

  if (response.ok) {
    return await response.json();
  }

  const message = await response.text();
  throw new Error(message.slice(0, 1000));
};

export const loadProjectDataByBuildId = async (
  params: {
    buildId: string;
    origin: string;
  } & (
    | {
        seviceToken: string;
      }
    | { authToken: string }
  )
): Promise<Data> => {
  const { sourceOrigin } = parseBuilderUrl(params.origin);

  const url = new URL(sourceOrigin);

  url.pathname = `/rest/build/${params.buildId}`;

  const headers = new Headers();
  if ("seviceToken" in params) {
    headers.set("Authorization", params.seviceToken);
  } else {
    headers.set("x-auth-token", params.authToken);
  }

  const response = await fetch(url.href, {
    headers,
  });

  if (response.ok) {
    return await response.json();
  }

  const message = await response.text();
  throw new Error(message.slice(0, 1000));
};

export const loadProjectDataByProjectId = async (params: {
  projectId: string;
  origin: string;
  authToken: string;
}): Promise<Data> => {
  const result = await getLatestBuildUsingProjectId(params);
  if (result.buildId === null) {
    throw new Error(`The project is not published yet`);
  }

  return await loadProjectDataByBuildId({
    buildId: result.buildId,
    origin: params.origin,
    authToken: params.authToken,
  });
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
