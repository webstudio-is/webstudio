import { type ActionArgs, redirect } from "@remix-run/node";
import { Links, Meta, Scripts } from "@remix-run/react";
import { canvasAuthenticator } from "~/services/auth.server";
import { StorageAccessRequest } from "~/shared/auth/storage-access-request";

export const loader = async ({ request }: ActionArgs) => {
  const url = new URL(request.url);
  // just redirect to returnTo page
  const returnTo = url.searchParams.get("returnTo");

  if (returnTo === null) {
    throw new Error("Missing returnTo search param");
  }

  // If BUILD_ORIGIN is not set we assume that canvas uses same host, no need in cookie
  if (process.env.BUILD_ORIGIN === undefined) {
    return redirect(returnTo);
  }

  const buildOriginHost = new URL(process.env.BUILD_ORIGIN).host;

  // BUILD_ORIGIN is set, and we are on canvas page on different host then render current page
  if (url.host.endsWith(buildOriginHost)) {
    // We are on canvas page on different host
    return null;
  }

  return redirect(returnTo);
};

export const action = async ({ request }: ActionArgs) => {
  const url = new URL(request.url);
  const returnTo = url.searchParams.get("returnTo");

  if (returnTo === null) {
    throw new Error("Missing returnTo search param");
  }

  try {
    return await canvasAuthenticator.authenticate("link", request, {
      successRedirect: returnTo,
      throwOnError: true,
    });
  } catch (error: unknown) {
    // all redirects are basically errors and in that case we don't want to catch it
    if (error instanceof Response) {
      return error;
    }
    if (error instanceof Error) {
      throw error;
    }
  }
};

export const meta = () => {
  return { title: "Webstudio Canvas Authentication" };
};

/**
 * In safari we need to request storage access, to be allow to set cookies on canvas page
 **/
const LinkRoute = () => {
  return (
    <html lang="en" style={{ display: "grid", minHeight: "100%" }}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
        <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon" />
        <Scripts />
        <Meta />
        <Links />
      </head>
      <body
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <StorageAccessRequest />
      </body>
    </html>
  );
};

export default LinkRoute;
