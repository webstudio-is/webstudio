import type { AUTH_PROVIDERS } from "~/shared/session";
import { publicStaticEnv } from "~/env/env.static";
import { getAuthorizationServerOrigin } from "./origins";
import type { BuilderMode } from "../nano-states/misc";

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
  pageId,
  authToken,
  pageHash,
  mode,
}: {
  pageId?: string;
  authToken?: string;
  pageHash?: string;
  mode?: "preview" | "content";
}) => {
  return `/${searchParams({
    pageId,
    authToken,
    pageHash,
    mode,
  })}`;
};

export const builderUrl = (props: {
  projectId: string;
  pageId?: string;
  origin: string;
  authToken?: string;
  mode?: BuilderMode;
}) => {
  const authServerOrigin = getAuthorizationServerOrigin(props.origin);

  const url = new URL(
    builderPath({ pageId: props.pageId, authToken: props.authToken }),
    authServerOrigin
  );

  const fragments = url.host.split(".");
  if (fragments.length <= 3) {
    fragments.splice(0, 0, "p-" + props.projectId);
  } else {
    // staging | development branches
    fragments[0] = "p-" + props.projectId + "-dot-" + fragments[0];
  }

  url.host = fragments.join(".");

  if (props.mode !== undefined) {
    url.searchParams.set("mode", props.mode);
  }

  return url.href;
};

export const dashboardPath = (
  view: "templates" | "search" | "projects" = "projects"
) => {
  if (view === "projects") {
    return `/dashboard`;
  }
  return `/dashboard/${view}`;
};

export const dashboardUrl = (props: { origin: string }) => {
  const authServerOrigin = getAuthorizationServerOrigin(props.origin);

  return `${authServerOrigin}/dashboard`;
};

export const cloneProjectUrl = (props: {
  origin: string;
  sourceAuthToken: string;
}) => {
  const authServerOrigin = getAuthorizationServerOrigin(props.origin);

  const searchParams = new URLSearchParams();
  searchParams.set("projectToCloneAuthToken", props.sourceAuthToken);

  return `${authServerOrigin}/dashboard?${searchParams.toString()}`;
};

export const loginPath = (params: {
  error?: (typeof AUTH_PROVIDERS)[keyof typeof AUTH_PROVIDERS];
  message?: string;
  returnTo?: string;
}) => `/login${searchParams(params)}`;

export const logoutPath = () => "/logout";
export const restLogoutPath = () => "/dashboard-logout";

export const userPlanSubscriptionPath = () => {
  const urlSearchParams = new URLSearchParams();
  urlSearchParams.set("return_url", window.location.href);

  return `/n8n/billing_portal/sessions?${urlSearchParams.toString()}`;
};

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

export const restAssetsPath = () => {
  return `/rest/assets`;
};

export const restAssetsUploadPath = ({ name }: { name: string }) => {
  return `/rest/assets/${name}`;
};

export const restPatchPath = () => {
  const urlSearchParams = new URLSearchParams();

  urlSearchParams.set("client-version", publicStaticEnv.VERSION);

  const urlSearchParamsString = urlSearchParams.toString();

  return `/rest/patch${
    urlSearchParamsString ? `?${urlSearchParamsString}` : ""
  }`;
};

export const getCanvasUrl = () => {
  return `/canvas`;
};

export const restAi = (subEndpoint?: "detect" | "audio/transcriptions") =>
  typeof subEndpoint === "string" ? `/rest/ai/${subEndpoint}` : "/rest/ai";

export const restResourcesLoader = () => `/rest/resources-loader`;

export const marketplacePath = (method: string) =>
  `/builder/marketplace/${method}`;
