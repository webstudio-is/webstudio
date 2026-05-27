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
  line: number;
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

export type BasicAuthInput =
  | {
      method: "basic";
      login: string;
      password: string;
    }
  | {
      type: "basic";
      login: string;
      password: string;
    };

export type WsAuthPageInput = {
  route: string;
  auth?: BasicAuthInput;
};

export type WsAuthResourcesInput = {
  existingContent: string;
  projectContent?: string;
  pages: WsAuthPageInput[];
  existingSourceName?: string;
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
  const routeError = validateRoute(route);
  if (routeError) {
    throw new Error(routeError);
  }
  const auth = validateBasicAuth({ login, password }).auth;
  if (auth === undefined) {
    throw new Error(
      'Basic auth requires non-empty login:password; login cannot contain ":" and neither field can contain whitespace'
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

const parameterSegment = /^:\w+[?*]?$/;

const validateRoute = (route: string) => {
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
    if (segment.includes("*")) {
      return "Wildcard can only be used as * or :name*";
    }
  }
};

export const parseWsAuth = (content: string): WsAuthParseResult => {
  const routes: WsAuthRoute[] = [];
  const errors: WsAuthParseError[] = [];
  let lineNumber = 0;
  for (const line of content.split(/\r?\n/)) {
    lineNumber += 1;
    const trimmedLine = line.trim();
    if (trimmedLine === "" || trimmedLine.startsWith("#")) {
      continue;
    }
    const parts = trimmedLine.split(/\s+/);
    if (parts.length !== 2) {
      errors.push({
        line: lineNumber,
        message:
          "Line must contain exactly a route and auth expression separated by whitespace",
      });
      continue;
    }
    const [route, authExpression] = parts;
    const routeError = validateRoute(route);
    if (routeError) {
      errors.push({ line: lineNumber, message: routeError });
      continue;
    }
    const auth = parseBasicAuthExpression(authExpression);
    if (auth === undefined) {
      errors.push({
        line: lineNumber,
        message:
          'Basic auth expression must be non-empty login:password; login cannot contain ":" and neither field can contain whitespace',
      });
      continue;
    }
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
      .map((error) => `${sourceName}:${error.line} ${error.message}`)
      .join("\n");
    throw new Error(message);
  }
  return result.routes;
};

export const serializeWsAuthRoute = ({ route, auth }: WsAuthRoute): string => {
  switch (auth.method) {
    case "basic":
      return `${route} ${auth.credentials}`;
  }
};

export const serializeWsAuth = (routes: WsAuthRoute[]) => {
  const lines = ["# Webstudio auth pages"];
  lines.push(...routes.map(serializeWsAuthRoute));
  return `${lines.join("\n")}\n`;
};

const generatedBlockStart = "# webstudio-auth-generated-start";
const generatedBlockEnd = "# webstudio-auth-generated-end";

export const stripGeneratedWsAuthContent = (content: string) => {
  const lines: string[] = [];
  let isGeneratedBlock = false;
  for (const line of content.split(/\r?\n/)) {
    if (line.trim() === generatedBlockStart) {
      isGeneratedBlock = true;
      continue;
    }
    if (line.trim() === generatedBlockEnd) {
      isGeneratedBlock = false;
      continue;
    }
    if (isGeneratedBlock === false) {
      lines.push(line);
    }
  }
  return lines.join("\n");
};

const serializeGeneratedWsAuthBlock = (routes: WsAuthRoute[]) => {
  if (routes.length === 0) {
    return "";
  }
  return [
    generatedBlockStart,
    "# Webstudio generated auth pages. Move routes outside this block to manage them manually.",
    ...routes.map(serializeWsAuthRoute),
    generatedBlockEnd,
    "",
  ].join("\n");
};

export const mergeWsAuthRoutes = (routes: WsAuthRoute[]) => {
  const routeNames = new Set<string>();
  const mergedRoutes: WsAuthRoute[] = [];
  for (const route of routes) {
    if (routeNames.has(route.route)) {
      continue;
    }
    routeNames.add(route.route);
    mergedRoutes.push(route);
  }
  return mergedRoutes;
};

export const mergeWsAuthSources = (sources: WsAuthSource[]) => {
  return mergeWsAuthRoutes(
    sources.flatMap((source) => {
      if ("content" in source) {
        return parseWsAuthOrThrow(source.content, source.name);
      }
      return source.routes;
    })
  );
};

export const buildWsAuth = (sources: WsAuthSource[]): WsAuthBuildResult => {
  const routes = mergeWsAuthSources(sources);
  return {
    routes,
    content: serializeWsAuth(routes),
  };
};

export const mergeWsAuthContent = ({
  existingContent,
  routes,
  sourceName = ".wsauth",
}: {
  existingContent: string;
  routes: WsAuthRoute[];
  sourceName?: string;
}) => {
  const manualContent = stripGeneratedWsAuthContent(existingContent);
  const manualRoutes = parseWsAuthOrThrow(manualContent, sourceName);
  const manualRouteNames = new Set(manualRoutes.map(({ route }) => route));
  const generatedRoutes = routes.filter(
    ({ route }) => manualRouteNames.has(route) === false
  );
  const generatedBlock = serializeGeneratedWsAuthBlock(generatedRoutes);

  if (manualContent.trim() === "") {
    return generatedBlock;
  }
  if (generatedBlock === "") {
    return manualContent;
  }

  const separator = manualContent.endsWith("\n\n")
    ? ""
    : manualContent.endsWith("\n")
      ? "\n"
      : "\n\n";
  return `${manualContent}${separator}${generatedBlock}`;
};

export const createWsAuthResources = ({
  existingContent,
  projectContent = "",
  pages,
  existingSourceName = ".wsauth",
  projectSourceName = "Auth",
  generatedSourceName = "Generated page auth",
}: WsAuthResourcesInput): WsAuthResources => {
  const manualExistingContent = stripGeneratedWsAuthContent(existingContent);
  const generatedRoutes = pages.flatMap((page) => {
    const route = createWsAuthRouteFromPage(page);
    return route === undefined ? [] : [route];
  });
  const result = buildWsAuth([
    { name: existingSourceName, content: manualExistingContent },
    { name: projectSourceName, content: projectContent },
    { name: generatedSourceName, routes: generatedRoutes },
  ]);
  console.info("[wsauth] create resources", {
    existingContentLength: existingContent.length,
    existingContent,
    manualExistingContentLength: manualExistingContent.length,
    manualExistingContent,
    projectContentLength: projectContent.length,
    projectContent,
    pageCount: pages.length,
    pages,
    generatedRouteCount: generatedRoutes.length,
    generatedRoutes,
    routeCount: result.routes.length,
    routes: result.routes,
  });
  const content = mergeWsAuthContent({
    existingContent,
    routes: result.routes,
    sourceName: existingSourceName,
  });
  return {
    ...result,
    content,
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

const normalizePathname = (pathname: string) => {
  if (pathname === "" || pathname === "/") {
    return "/";
  }
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
};

export const matchWsAuthRoute = (route: string, pathname: string) => {
  const routeSegments = normalizePathname(route).slice(1).split("/");
  const pathnameSegments = normalizePathname(pathname).slice(1).split("/");
  const matchSegments = (
    routeIndex: number,
    pathnameIndex: number
  ): boolean => {
    const routeSegment = routeSegments[routeIndex];
    const pathnameSegment = pathnameSegments[pathnameIndex];
    if (routeSegment === undefined) {
      return pathnameSegment === undefined;
    }
    if (routeSegment === "*" || /^:\w+\*$/.test(routeSegment)) {
      return routeIndex === routeSegments.length - 1;
    }
    if (/^:\w+\?$/.test(routeSegment)) {
      return (
        matchSegments(routeIndex + 1, pathnameIndex) ||
        (pathnameSegment !== undefined &&
          matchSegments(routeIndex + 1, pathnameIndex + 1))
      );
    }
    if (pathnameSegment === undefined) {
      return false;
    }
    if (/^:\w+$/.test(routeSegment)) {
      return matchSegments(routeIndex + 1, pathnameIndex + 1);
    }
    return (
      routeSegment === pathnameSegment &&
      matchSegments(routeIndex + 1, pathnameIndex + 1)
    );
  };
  return matchSegments(0, 0);
};

export const findWsAuthRoute = (
  authRoutes: WsAuthRoute[],
  pathname: string
) => {
  const authRoute = authRoutes.find(({ route }) =>
    matchWsAuthRoute(route, pathname)
  );
  console.info("[wsauth] find route", {
    pathname,
    routeCount: authRoutes.length,
    authRoutes,
    matchedRoute: authRoute?.route,
    matchedAuth: authRoute?.auth,
  });
  return authRoute;
};

export const authenticateRequest = (
  request: Request,
  authRoutes: WsAuthRoute[]
) => {
  const url = new URL(request.url);
  const authorization = request.headers.get("Authorization");
  console.info("[wsauth] authenticate request", {
    method: request.method,
    url: url.href,
    pathname: url.pathname,
    routeCount: authRoutes.length,
    authRoutes,
    hasAuthorization: authorization !== null,
    authorization,
    authorizationScheme: authorization?.split(/\s+/, 1)[0]?.toLowerCase(),
  });
  const authRoute = findWsAuthRoute(authRoutes, url.pathname);
  if (authRoute === undefined) {
    console.info("[wsauth] authenticate result", {
      pathname: url.pathname,
      result: "not-protected",
    });
    return;
  }
  if (authRoute.auth.method === "basic") {
    const credentials = getBasicAuthCredentials(authorization);
    if (credentials === authRoute.auth.credentials) {
      console.info("[wsauth] authenticate result", {
        pathname: url.pathname,
        route: authRoute.route,
        method: authRoute.auth.method,
        result: "authorized",
        hasParsedCredentials: credentials !== undefined,
        parsedCredentials: credentials,
        expectedCredentials: authRoute.auth.credentials,
        expectedLogin: authRoute.auth.login,
        expectedPassword: authRoute.auth.password,
      });
      return authRoute;
    }
    console.warn("[wsauth] authenticate result", {
      pathname: url.pathname,
      route: authRoute.route,
      method: authRoute.auth.method,
      result: "unauthorized",
      hasAuthorization: authorization !== null,
      hasParsedCredentials: credentials !== undefined,
      authorization,
      parsedCredentials: credentials,
      expectedCredentials: authRoute.auth.credentials,
      expectedLogin: authRoute.auth.login,
      expectedPassword: authRoute.auth.password,
    });
    throw new Response("Authentication required", {
      status: 401,
      headers: {
        "WWW-Authenticate": `Basic realm="Webstudio"`,
        "Cache-Control": "private, no-store",
      },
    });
  }
};
