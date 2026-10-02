import { parseEmailMailboxes, parseEmailSender } from "@webstudio-is/sdk";
import {
  findWsAuthRoute,
  parseWsAuth,
  type WsAuthRoute,
} from "@webstudio-is/wsauth";

export const validateContactEmail = (
  contactEmail: string,
  maxContactEmailsPerProject?: number
) => {
  const emails = parseEmailMailboxes(contactEmail);
  if (emails?.length === 0) {
    return;
  }
  if (emails === undefined) {
    return "Contact email is invalid.";
  }
  if (
    maxContactEmailsPerProject !== undefined &&
    emails.length > maxContactEmailsPerProject
  ) {
    if (maxContactEmailsPerProject === 0) {
      return `Upgrade to PRO to customize the contact email.`;
    }
    return `Only ${maxContactEmailsPerProject} emails are allowed.`;
  }
};

export const validateEmailSender = (sender: string) =>
  sender.trim() === "" || parseEmailSender(sender)
    ? undefined
    : "Sender must contain exactly one valid email address.";

export const validateEmailText = (
  value: string,
  label: string,
  multiline = false
) =>
  // eslint-disable-next-line no-control-regex
  /[\u0000-\u001f\u007f]/.test(multiline ? value.replaceAll("\n", "") : value)
    ? `${label} contains an invalid control character.`
    : undefined;

export const validateProjectAuth = (auth: string) => {
  const result = parseWsAuth(auth);
  if (result.errors.length === 0) {
    return;
  }
  return result.errors
    .map((error) => `${error.path}: ${error.message}`)
    .join("\n");
};

export const parseProjectAuthRoutes = (auth: string | undefined) =>
  parseWsAuth(auth ?? "");

export const getProjectBasicAuthCredentials = (
  auth: string | undefined,
  pathname: string
) => {
  const route = findWsAuthRoute(parseProjectAuthRoutes(auth).routes, pathname);
  if (route?.auth.method !== "basic") {
    return;
  }
  return { username: route.auth.login, password: route.auth.password };
};

export const validateProjectAuthRouteSyntax = (route: string) => {
  const result = parseWsAuth(
    JSON.stringify({
      version: 1,
      routes: {
        [route]: {
          method: "basic",
          login: "login",
          password: "password",
        },
      },
    })
  );
  return result.errors.find((error) =>
    error.path.startsWith(`routes.${JSON.stringify(route)}`)
  )?.message;
};

export const validateProjectAuthRoute = (
  route: string,
  authRoutes: readonly WsAuthRoute[]
) => {
  const errors: string[] = [];
  if (route === "") {
    errors.push("Route is required");
    return errors;
  }
  const routeError = validateProjectAuthRouteSyntax(route);
  if (routeError !== undefined) {
    errors.push(routeError);
  }
  if (authRoutes.some((authRoute) => authRoute.route === route)) {
    errors.push("This route already requires authentication");
  }
  return errors;
};
