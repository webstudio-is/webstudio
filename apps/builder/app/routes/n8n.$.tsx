import { redirect } from "@remix-run/node";
import {
  isRouteErrorResponse,
  useLoaderData,
  useRouteError,
} from "@remix-run/react";
import { z } from "zod";
import { findAuthenticatedUser } from "~/services/auth.server";
import { loginPath } from "~/shared/router-utils";
import env from "~/env/env.server";
import {
  // eslint-disable-next-line camelcase
  type V2_ServerRuntimeMetaFunction,
  type LoaderArgs,
  json,
} from "@remix-run/server-runtime";

const zN8NResponse = z.object({
  title: z.string(),
  description: z.string(),
});

const zWebhookEnv = z.object({
  N8N_WEBHOOK_URL: z.string(),
  N8N_WEBHOOK_TOKEN: z.string(),
});

export const loader = async ({ request, params }: LoaderArgs) => {
  const user = await findAuthenticatedUser(request);

  if (user === null) {
    const url = new URL(request.url);
    throw redirect(
      loginPath({
        returnTo: `${url.pathname}?${url.searchParams.toString()}`,
      })
    );
  }

  const webhookEnvParsed = zWebhookEnv.safeParse(env);
  if (webhookEnvParsed.success === false) {
    throw new Response(webhookEnvParsed.error.message, {
      status: 400,
    });
  }

  const webhookEnv = webhookEnvParsed.data;

  const response = await fetch(`${webhookEnv.N8N_WEBHOOK_URL}/${params["*"]}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${webhookEnv.N8N_WEBHOOK_TOKEN}`,
    },
    body: JSON.stringify({
      userId: user.id,
      query: Object.fromEntries(new URL(request.url).searchParams),
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
  const n8nResponseParsed = zN8NResponse.safeParse(responseJson);

  if (n8nResponseParsed.success === false) {
    throw new Response(n8nResponseParsed.error.message, {
      status: 400,
    });
  }

  const { title, description } = n8nResponseParsed.data;

  return json({ user, title, description });
};

// eslint-disable-next-line camelcase
export const meta: V2_ServerRuntimeMetaFunction<typeof loader> = ({ data }) => {
  return [
    {
      title: data?.title,
    },
  ];
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

const N8NResponse = () => {
  const data = useLoaderData<typeof loader>();

  return <div dangerouslySetInnerHTML={{ __html: data.description }} />;
};

export default N8NResponse;
