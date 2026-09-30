import type { BasicAuthInput, WsAuthConfig } from "./schema";
import { matchRoutes } from "@remix-run/router";
export type { BasicAuthInput, WsAuthConfig } from "./schema";

export type BasicAuthRule = {
  method: "basic";
  login: string;
  password: string;
  credentials: string;
};

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

export type BasicAuthValidation = {
  auth?: BasicAuthRule;
  issues?: BasicAuthIssue[];
  errors?: {
    login?: string[];
    password?: string[];
  };
};

export type BasicAuthIssue = {
  path: ["login"] | ["password"];
  message: string;
};

const basicLoginErrors = (login: string) => {
  const issues: BasicAuthIssue[] = [];
  if (login.length === 0) {
    issues.push({ path: ["login"], message: "Login is required" });
  }
  if (login.includes(":")) {
    issues.push({ path: ["login"], message: "Login can't contain a colon" });
  }
  if (/\s/.test(login)) {
    issues.push({
      path: ["login"],
      message: "Login can't contain whitespace",
    });
  }
  return issues;
};

const basicPasswordErrors = (password: string) => {
  const issues: BasicAuthIssue[] = [];
  if (password.length === 0) {
    issues.push({ path: ["password"], message: "Password is required" });
  }
  if (/\s/.test(password)) {
    issues.push({
      path: ["password"],
      message: "Password can't contain whitespace",
    });
  }
  return issues;
};

export const validateBasicAuth = ({
  login,
  password,
}: {
  login: string;
  password: string;
}): BasicAuthValidation => {
  const issues = [...basicLoginErrors(login), ...basicPasswordErrors(password)];
  if (issues.length > 0) {
    const loginErrors = issues
      .filter((issue) => issue.path[0] === "login")
      .map((issue) => issue.message);
    const passwordErrors = issues
      .filter((issue) => issue.path[0] === "password")
      .map((issue) => issue.message);
    return {
      issues,
      errors: {
        login: loginErrors.length > 0 ? loginErrors : undefined,
        password: passwordErrors.length > 0 ? passwordErrors : undefined,
      },
    };
  }
  return {
    auth: {
      method: "basic",
      login,
      password,
      credentials: `${login}:${password}`,
    },
  };
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
  const routeError = validatePathnamePattern(route);
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

const parameterSegment = /^:\w+[?*]?$/;

/** Validate the route-rule syntax shared by authentication and response headers. */
export const validatePathnamePattern = (route: string) => {
  if (route.startsWith("/") === false) {
    return 'Route must start with "/"';
  }
  if (route === "/") {
    return;
  }
  if (route !== "/" && route.endsWith("/")) {
    return 'Route must not end with "/"';
  }
  if (route.includes("//")) {
    return 'Route must not contain repeating "/"';
  }
  const segments = route.slice(1).split("/");
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    if (segment === undefined || segment === "") {
      return "Route contains an empty segment";
    }
    if (segment === "*" || /^:\w+\*$/.test(segment)) {
      if (index !== segments.length - 1) {
        return "Wildcard route segment must be the last segment";
      }
      continue;
    }
    if (segment.startsWith(":") && parameterSegment.test(segment) === false) {
      return `Invalid route parameter "${segment}"`;
    }
    if (segment.includes("?")) {
      if (parameterSegment.test(segment) === false) {
        return 'Optional marker "?" is only allowed on a named parameter';
      }
    }
    if (segment.includes("*")) {
      return "Wildcard can only be used as * or :name*";
    }
    if (segment.includes("%")) {
      let decoded: string;
      try {
        decoded = decodeURIComponent(segment);
      } catch {
        return `Invalid URL encoding in route segment "${segment}"`;
      }
      if (decoded.startsWith(":") || /[?*]/.test(decoded)) {
        return `Encoded route syntax is not supported in "${segment}"`;
      }
    }
  }
};

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
    const routeError = validatePathnamePattern(route);
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

const toRouterPattern = (pattern: string) =>
  (pattern || "/")
    .replace(/:\w+\*$/, "*")
    .split("/")
    .map((segment) => {
      if (segment === "*" || segment.startsWith(":")) {
        return segment;
      }
      try {
        // matchRoutes decodes the request pathname before matching route paths.
        // Keep encoded slashes inside their original segment.
        return decodeURIComponent(segment).replaceAll("/", "%2F");
      } catch {
        return segment;
      }
    })
    .join("/");

const toWebstudioParams = (
  pattern: string,
  params: Record<string, string | undefined>
) => {
  const result = { ...params };
  const namedSplat = pattern.match(/:(\w+)\*$/)?.[1];
  if (namedSplat) {
    result[namedSplat] = result["*"];
    delete result["*"];
  } else if (pattern.endsWith("/*")) {
    result[0] = result["*"];
    delete result["*"];
  }
  return result;
};

/** Match a set of page paths with the same route ranking as the published app. */
export const matchPathnameRoutes = <Value>(
  routes: ReadonlyArray<{ pattern: string; value: Value }>,
  pathname: string
): { value: Value; params: Record<string, string | undefined> } | undefined => {
  const routerRoutes = routes.map((route) => ({
    path: toRouterPattern(route.pattern),
    caseSensitive: false,
    source: route,
  }));
  const match = matchRoutes(routerRoutes, pathname)?.at(-1);
  if (match === undefined) {
    return;
  }
  return {
    value: match.route.source.value,
    params: toWebstudioParams(match.route.source.pattern, match.params),
  };
};

/** Match one project rule or page path using the published app's route semantics. */
export const matchPathnamePattern = (pattern: string, pathname: string) =>
  matchPathnameRoutes([{ pattern, value: true }], pathname)?.params;

export const matchesPathnamePattern = (pattern: string, pathname: string) =>
  matchPathnamePattern(pattern, pathname) !== undefined;

export const findWsAuthRoute = (authRoutes: WsAuthRoute[], pathname: string) =>
  authRoutes.find(({ route }) => matchesPathnamePattern(route, pathname));

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
