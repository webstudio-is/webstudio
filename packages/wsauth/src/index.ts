import type { BasicAuthInput, WsAuthConfig } from "./schema";
import {
  matchesPathnamePattern,
  validatePathnamePattern,
} from "@webstudio-is/sdk/url-pattern";
export type { BasicAuthInput, WsAuthConfig } from "./schema";

import { validateBasicAuth } from "@webstudio-is/sdk/basic-auth";
export { validateBasicAuth } from "@webstudio-is/sdk/basic-auth";
export type {
  BasicAuthRule,
  BasicAuthValidation,
  BasicAuthIssue,
} from "@webstudio-is/sdk/basic-auth";
import type { BasicAuthRule } from "@webstudio-is/sdk/basic-auth";

export type AuthRule = BasicAuthRule;

export type WsAuthRoute = {
  route: string;
  auth: AuthRule;
};

export type WsAuthParseError = {
  path: string;
  message: string;
};

export type WsAuthParseResult = {
  routes: WsAuthRoute[];
  errors: WsAuthParseError[];
};

export type WsAuthSource =
  | {
      name: string;
      content: string;
    }
  | {
      name: string;
      routes: WsAuthRoute[];
    };

export type WsAuthBuildResult = {
  routes: WsAuthRoute[];
  content: string;
};

export type WsAuthPageInput = {
  route: string;
  auth?: BasicAuthInput;
};

export type WsAuthResourcesInput = {
  projectContent?: string;
  pages: WsAuthPageInput[];
  projectSourceName?: string;
  generatedSourceName?: string;
};

export type WsAuthResources = WsAuthBuildResult & {
  module: string;
};

export const parseBasicAuthExpression = (expression: string) => {
  const separatorIndex = expression.indexOf(":");
  if (separatorIndex === -1) {
    return;
  }
  return validateBasicAuth({
    login: expression.slice(0, separatorIndex),
    password: expression.slice(separatorIndex + 1),
  }).auth;
};

export const createBasicAuthRoute = ({
  route,
  login,
  password,
}: {
  route: string;
  login: string;
  password: string;
}): WsAuthRoute => {
  const routeError = validateWsAuthRoute(route);
  if (routeError) {
    throw new Error(routeError);
  }
  const auth = validateBasicAuth({ login, password }).auth;
  if (auth === undefined) {
    throw new Error(
      'Basic auth requires non-empty login and password; login cannot contain ":" and neither field can contain whitespace'
    );
  }
  return { route, auth };
};

export const createWsAuthRouteFromPage = ({
  route,
  auth,
}: WsAuthPageInput): WsAuthRoute | undefined => {
  if (auth === undefined) {
    return;
  }
  if (
    ("method" in auth && auth.method !== "basic") ||
    ("type" in auth && auth.type !== "basic")
  ) {
    throw new Error(`Unsupported auth method for route "${route}"`);
  }
  return createBasicAuthRoute({
    route,
    login: auth.login,
    password: auth.password,
  });
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray(value) === false
  );
};

export const validateWsAuthRoute = validatePathnamePattern;

const parseJson = (content: string, errors: WsAuthParseError[]) => {
  if (content.trim() === "") {
    return { version: 1, routes: {} };
  }
  try {
    return JSON.parse(content) as unknown;
  } catch (error) {
    errors.push({
      path: "$",
      message: error instanceof Error ? error.message : "Invalid JSON",
    });
  }
};

export const parseWsAuth = (content: string): WsAuthParseResult => {
  const routes: WsAuthRoute[] = [];
  const errors: WsAuthParseError[] = [];
  const json = parseJson(content, errors);
  if (json === undefined) {
    return { routes, errors };
  }
  if (isRecord(json) === false) {
    errors.push({ path: "$", message: "Auth config must be an object" });
    return { routes, errors };
  }
  if (json.version !== 1) {
    errors.push({ path: "version", message: "Version must be 1" });
  }
  if (isRecord(json.routes) === false) {
    errors.push({ path: "routes", message: "Routes must be an object" });
    return { routes, errors };
  }

  for (const [route, authInput] of Object.entries(json.routes)) {
    const routeError = validateWsAuthRoute(route);
    if (routeError) {
      errors.push({
        path: `routes.${JSON.stringify(route)}`,
        message: routeError,
      });
      continue;
    }
    if (isRecord(authInput) === false) {
      errors.push({
        path: `routes.${JSON.stringify(route)}`,
        message: "Auth rule must be an object",
      });
      continue;
    }
    if (authInput.method !== "basic") {
      errors.push({
        path: `routes.${JSON.stringify(route)}.method`,
        message: 'Auth method must be "basic"',
      });
      continue;
    }
    const login = authInput.login;
    const password = authInput.password;
    if (typeof login !== "string") {
      errors.push({
        path: `routes.${JSON.stringify(route)}.login`,
        message: "Login must be a string",
      });
      continue;
    }
    if (typeof password !== "string") {
      errors.push({
        path: `routes.${JSON.stringify(route)}.password`,
        message: "Password must be a string",
      });
      continue;
    }
    const validation = validateBasicAuth({ login, password });
    if (validation.auth === undefined) {
      for (const issue of validation.issues ?? []) {
        errors.push({
          path: `routes.${JSON.stringify(route)}.${issue.path[0]}`,
          message: issue.message,
        });
      }
      continue;
    }
    const auth = validation.auth;
    routes.push({ route, auth });
  }
  return { routes, errors };
};

export const parseWsAuthOrThrow = (
  content: string,
  sourceName: string
): WsAuthRoute[] => {
  const result = parseWsAuth(content);
  if (result.errors.length > 0) {
    const message = result.errors
      .map((error) => `${sourceName}:${error.path} ${error.message}`)
      .join("\n");
    throw new Error(message);
  }
  return result.routes;
};

export const serializeWsAuth = (routes: WsAuthRoute[]) => {
  const config: WsAuthConfig = { version: 1, routes: {} };
  for (const { route, auth } of routes) {
    switch (auth.method) {
      case "basic":
        config.routes[route] = {
          method: "basic",
          login: auth.login,
          password: auth.password,
        };
        break;
    }
  }
  return `${JSON.stringify(config, null, 2)}\n`;
};

const collectWsAuthRoutes = (sources: WsAuthSource[]) => {
  return sources.flatMap((source) => {
    if ("content" in source) {
      return parseWsAuthOrThrow(source.content, source.name);
    }
    return source.routes;
  });
};

export const buildWsAuth = (sources: WsAuthSource[]): WsAuthBuildResult => {
  const content = serializeWsAuth(collectWsAuthRoutes(sources));
  const routes = parseWsAuthOrThrow(content, "Serialized auth config");
  return {
    routes,
    content,
  };
};

export const createWsAuthResources = ({
  projectContent = "",
  pages,
  projectSourceName = "Auth",
  generatedSourceName = "Generated page auth",
}: WsAuthResourcesInput): WsAuthResources => {
  const generatedRoutes = pages.flatMap((page) => {
    const route = createWsAuthRouteFromPage(page);
    return route === undefined ? [] : [route];
  });
  const result = buildWsAuth([
    { name: projectSourceName, content: projectContent },
    { name: generatedSourceName, routes: generatedRoutes },
  ]);
  return {
    ...result,
    module: [
      `import type { WsAuthRoute } from "@webstudio-is/wsauth";`,
      "",
      `export const authRoutes: WsAuthRoute[] = ${JSON.stringify(
        result.routes,
        null,
        2
      )};`,
      "",
    ].join("\n"),
  };
};

const decodeBase64 = (value: string) => {
  try {
    if (typeof atob === "function") {
      return atob(value);
    }
    const buffer = (
      globalThis as {
        Buffer?: {
          from: (
            value: string,
            encoding: "base64"
          ) => { toString: (encoding: "utf-8") => string };
        };
      }
    ).Buffer;
    return buffer?.from(value, "base64").toString("utf-8") ?? "";
  } catch {
    return "";
  }
};

export const getBasicAuthCredentials = (authorization: string | null) => {
  const [scheme, encodedCredentials] = authorization?.split(/\s+/, 2) ?? [];
  const credentials =
    scheme?.toLowerCase() === "basic" && encodedCredentials !== undefined
      ? decodeBase64(encodedCredentials)
      : "";
  const auth = parseBasicAuthExpression(credentials);
  return auth?.credentials;
};

export const matchWsAuthRoute = matchesPathnamePattern;

export const findWsAuthRoute = (authRoutes: WsAuthRoute[], pathname: string) =>
  authRoutes.find(({ route }) => matchWsAuthRoute(route, pathname));

export const authenticateRequest = (
  request: Request,
  authRoutes: WsAuthRoute[]
) => {
  const url = new URL(request.url);
  const authorization = request.headers.get("Authorization");
  const authRoute = findWsAuthRoute(authRoutes, url.pathname);
  if (authRoute === undefined) {
    return;
  }
  if (authRoute.auth.method === "basic") {
    const credentials = getBasicAuthCredentials(authorization);
    if (credentials === authRoute.auth.credentials) {
      return authRoute;
    }
    throw new Response("Authentication required", {
      status: 401,
      headers: {
        "WWW-Authenticate": `Basic realm="Webstudio"`,
        "Cache-Control": "private, no-store",
      },
    });
  }
};
