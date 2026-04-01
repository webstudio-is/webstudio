import { type LoaderFunctionArgs, json } from "@remix-run/server-runtime";
import { isRouteErrorResponse, useRouteError } from "@remix-run/react";
import { z } from "zod";
import { findAuthenticatedUser } from "~/services/auth.server";
import { isDashboard, loginPath } from "~/shared/router-utils";
import env from "~/env/env.server";
import cookie from "cookie";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import { redirect } from "~/services/no-store-redirect";
import { allowedDestinations } from "~/services/destinations.server";

const zWorkerResponse = z.union([
  z.object({
    type: z.literal("error"),
    error: z.string(),
  }),
  z.object({
    type: z.literal("redirect"),
    to: z.string(),
  }),
]);

const zWorkerEnv = z.object({
  PAYMENT_WORKER_URL: z.string(),
  PAYMENT_WORKER_TOKEN: z.string(),
});

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (isDashboard(request) === false) {
    throw new Response("Not Found", {
      status: 404,
    });
  }

  preventCrossOriginCookie(request);
  allowedDestinations(request, ["document", "empty"]);

  const user = await findAuthenticatedUser(request);

  if (user === null) {
    const url = new URL(request.url);
    throw redirect(
      loginPath({
        returnTo: `${url.pathname}?${url.searchParams.toString()}`,
      })
    );
  }

  const workerEnvParsed = zWorkerEnv.safeParse(env);
  if (workerEnvParsed.success === false) {
    throw new Response(workerEnvParsed.error.message, {
      status: 400,
    });
  }

  const workerEnv = workerEnvParsed.data;

  const workerUrl = new URL(workerEnv.PAYMENT_WORKER_URL);
  workerUrl.pathname = `${workerUrl.pathname}/billing-portal/sessions`
    .split("/")
    .filter(Boolean)
    .join("/");
  workerUrl.search = new URL(request.url).search;

  const requestUrl = new URL(request.url);

  const response = await fetch(workerUrl.href, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${workerEnv.PAYMENT_WORKER_TOKEN}`,
    },
    body: JSON.stringify({
      userId: user.id,
      cookies: cookie.parse(request.headers.get("cookie") ?? ""),
      requestUrl: requestUrl.href,
    }),
  });

  if (response.ok === false) {
    const text = await response.text();

    throw new Response(
      `Fetch error status="${response.status}"\nMessage:\n${text.slice(
        0,
        1000
      )}"`,
      {
        status: response.status,
      }
    );
  }

  const responseJson = await response.json();
  const workerResponseParsed = zWorkerResponse.safeParse(responseJson);

  if (workerResponseParsed.success === false) {
    throw new Response(workerResponseParsed.error.message, {
      status: 400,
    });
  }

  const workerResponse = workerResponseParsed.data;

  if (workerResponse.type === "error") {
    throw new Response(workerResponse.error, {
      status: 400,
    });
  }

  if (workerResponse.type === "redirect") {
    throw redirect(workerResponse.to);
  }

  workerResponse satisfies never;

  return json({});
};

export const ErrorBoundary = () => {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return <div style={{ whiteSpace: "pre-wrap" }}>{error.data}</div>;
  }

  return <div>Unexpected error</div>;
};
