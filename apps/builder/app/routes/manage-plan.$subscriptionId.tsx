import { type LoaderFunctionArgs } from "@remix-run/server-runtime";
import { isRouteErrorResponse, useRouteError } from "@remix-run/react";
import { z } from "zod";
import { findAuthenticatedUser } from "~/services/auth.server";
import { isDashboard, loginPath } from "~/shared/router-utils";
import env from "~/env/env.server";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import { redirect } from "~/services/no-store-redirect";
import { allowedDestinations } from "~/services/destinations.server";

const WorkerEnvSchema = z.object({
  PLAN_WORKER_URL: z.string(),
  PLAN_WORKER_TOKEN: z.string(),
});

const ResponseSchema = z.union([
  z.object({ type: z.literal("error"), error: z.string() }),
  z.object({ type: z.literal("redirect"), to: z.string() }),
]);

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  if (isDashboard(request) === false) {
    throw new Response("Not Found", { status: 404 });
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

  const subscriptionId = params["subscriptionId"];
  if (!subscriptionId) {
    throw new Response("Missing subscription ID", { status: 400 });
  }

  const workerEnvParsed = WorkerEnvSchema.safeParse(env);
  if (workerEnvParsed.success === false) {
    throw new Response(workerEnvParsed.error.message, { status: 400 });
  }

  const workerEnv = workerEnvParsed.data;
  const returnUrl = new URL(request.url).searchParams.get("return_url");

  const response = await fetch(`${workerEnv.PLAN_WORKER_URL}/manage-plan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${workerEnv.PLAN_WORKER_TOKEN}`,
    },
    body: JSON.stringify({
      userId: user.id,
      subscriptionId,
      returnUrl: returnUrl ?? new URL("/", request.url).href,
    }),
  });

  if (response.ok === false) {
    const text = await response.text();
    throw new Response(`Error: ${response.status}\n${text.slice(0, 1000)}`, {
      status: response.status,
    });
  }

  const json = await response.json();
  const parsed = ResponseSchema.safeParse(json);

  if (parsed.success === false) {
    throw new Response(parsed.error.message, { status: 400 });
  }

  if (parsed.data.type === "error") {
    throw new Response(parsed.data.error, { status: 400 });
  }

  if (parsed.data.type === "redirect") {
    throw redirect(parsed.data.to);
  }

  parsed.data satisfies never;
  throw new Response("Unexpected response", { status: 500 });
};

export const ErrorBoundary = () => {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return <div style={{ whiteSpace: "pre-wrap" }}>{error.data}</div>;
  }

  if (error instanceof Error) {
    return <div style={{ whiteSpace: "pre-wrap" }}>{error.message}</div>;
  }

  return <div style={{ whiteSpace: "pre-wrap" }}>{String(error)}</div>;
};
