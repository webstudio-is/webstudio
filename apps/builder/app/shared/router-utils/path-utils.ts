import type { AUTH_PROVIDERS } from "~/shared/session";
import type { Page } from "@webstudio-is/project-build";
import type { Project } from "@webstudio-is/project";
import type { ThemeSetting } from "~/shared/theme";
import env from "~/shared/env";

const searchParams = (params: Record<string, string | undefined | null>) => {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      searchParams.set(key, value);
    }
  }
  const asString = searchParams.toString();
  return asString === "" ? "" : `?${asString}`;
};

export const builderPath = ({
  projectId,
  pageId,
  authToken,
}: {
  projectId: string;
  pageId?: string;
  authToken?: string;
}) => {
  return `/builder/${projectId}${searchParams({ pageId, authToken })}`;
};

export const builderUrl = (props: {
  projectId: string;
  pageId?: string;
  origin: string;
  authToken?: string;
  mode?: "edit" | "preview";
}) => {
  const { projectId, pageId, authToken } = props;
  const url = new URL(
    builderPath({ projectId, pageId, authToken }),
    props.origin
  );

  if (props.mode !== undefined) {
    url.searchParams.set("mode", props.mode);
  }

  return url.href;
};

export const dashboardPath = () => {
  return "/dashboard";
};

export const dashboardProjectPath = (method: string) =>
  `/dashboard/projects/${method}`;

export const authorizationTokenPath = (method: string) =>
  `/rest/authorization-token/${method}`;

export const loginPath = (params: {
  error?: (typeof AUTH_PROVIDERS)[keyof typeof AUTH_PROVIDERS];
  message?: string;
  returnTo?: string;
}) => `/login${searchParams(params)}`;

export const logoutPath = () => "/logout";

export const authCallbackPath = ({
  provider,
}: {
  provider: "google" | "github";
}) => `/auth/${provider}/callback`;

export const authPath = ({
  provider,
}: {
  provider: "google" | "github" | "dev";
}) => `/auth/${provider}`;

export const restAssetsPath = ({
  projectId,
  authToken,
}: {
  projectId: string;
  authToken?: string;
}) => {
  const urlSearchParams = new URLSearchParams();
  if (authToken !== undefined) {
    urlSearchParams.set("authToken", authToken);
  }
  const urlSearchParamsString = urlSearchParams.toString();

  return `/rest/assets/${projectId}${
    urlSearchParamsString ? `?${urlSearchParamsString}` : ""
  }`;
};

export const restThemePath = ({ setting }: { setting: ThemeSetting }) =>
  `/rest/theme/${setting}`;

export const restPatchPath = (props: { authToken?: string }) => {
  const urlSearchParams = new URLSearchParams();
  if (props.authToken !== undefined) {
    urlSearchParams.set("authToken", props.authToken);
  }

  const urlSearchParamsString = urlSearchParams.toString();

  return `/rest/patch${
    urlSearchParamsString ? `?${urlSearchParamsString}` : ""
  }`;
};

export const restPublishPath = () => "/rest/publish";

export const getBuildUrl = ({
  buildOrigin,
  project,
  page,
  // Hidden token for canvas (should not be visible in browser URL)
  authReadToken,
  // Token to share project
  authToken,
}: {
  buildOrigin: string;
  project: Project;
  page: Page;
  authReadToken?: string;
  authToken?: string;
}) => {
  const url = new URL(buildOrigin);
  url.pathname = page.path;

  if (env.BUILD_REQUIRE_SUBDOMAIN) {
    url.host = `${project.domain}.${url.host}`;
  }

  url.searchParams.set("projectId", project.id);

  if (authReadToken) {
    url.searchParams.set("authReadToken", authReadToken);
  }

  if (authToken) {
    url.searchParams.set("authToken", authToken);
  }

  return url.toString();
};

export const getPublishedUrl = (domain: string) => {
  const protocol = typeof location === "object" ? location.protocol : "https:";

  const publisherHost =
    env.PUBLISHER_ENDPOINT && env.PUBLISHER_HOST ? env.PUBLISHER_HOST : "";

  // We use location.host to get the hostname and port in development mode and to not break local testing.
  const localhost = typeof location === "object" ? location.host : "";

  const host = publisherHost || env.BUILDER_HOST || localhost;

  return `${protocol}//${domain}.${host}`;
};
