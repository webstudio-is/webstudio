import { AUTH_PROVIDERS } from "~/shared/session";
import type { ThemeSetting } from "./theme";

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

export const designerPath = ({
  projectId,
  pageId,
}: {
  projectId: string;
  pageId?: string;
}) => `/designer/${projectId}${searchParams({ pageId })}`;

export const dashboardPath = () => "/dashboard";

export const loginPath = (params: {
  error?: typeof AUTH_PROVIDERS[keyof typeof AUTH_PROVIDERS];
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

export const restPagesPath = ({ projectId }: { projectId: string }) =>
  `/rest/pages/${projectId}`;

export const restAssetsPath = ({ projectId }: { projectId: string }) =>
  `/rest/assets/${projectId}`;

export const restThemePath = ({ setting }: { setting: ThemeSetting }) =>
  `/rest/theme/${setting}`;

export const restPatchPath = () => "/rest/patch";

export const restPublishPath = () => "/rest/publish";
