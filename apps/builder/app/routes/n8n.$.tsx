import { redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
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
        returnTo: url.pathname,
      })
    );
  }

  const webhookEnv = zWebhookEnv.parse(env);

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

    throw new Error(
      `Fetch error status="${response.status}" text="${text.slice(0, 1000)}"`
    );
  }
  const responseJson = await response.json();
  const { title, description } = zN8NResponse.parse(responseJson);

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

const N8NResponse = () => {
  const data = useLoaderData<typeof loader>();
  return <div dangerouslySetInnerHTML={{ __html: data.description }} />;
};

export default N8NResponse;
