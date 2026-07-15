import { z } from "zod";
import { parseWsAuth, type WsAuthRoute } from "@webstudio-is/wsauth";

const emailAddress = z.string().email();

const getContactEmails = (contactEmail: string) => {
  const trimmedContactEmail = contactEmail.trim();
  if (trimmedContactEmail.length === 0) {
    return [];
  }
  return trimmedContactEmail.split(/\s*,\s*/);
};

export const validateContactEmail = (
  contactEmail: string,
  maxContactEmailsPerProject?: number
) => {
  const emails = getContactEmails(contactEmail);
  if (emails.length === 0) {
    return;
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
  if (
    emails.every((email) => emailAddress.safeParse(email).success) === false
  ) {
    return "Contact email is invalid.";
  }
};

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
