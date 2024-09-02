import { type LoaderFunctionArgs, json } from "@remix-run/server-runtime";
import { useLoaderData, type MetaFunction } from "@remix-run/react";
import { getAuthorizationServerOrigin } from "~/shared/router-utils/origins";
import { builderSessionStorage } from "~/services/builder-session.server";
import { sessionStorage } from "~/services/session.server";
import { authenticator } from "~/services/auth.server";
import { builderAuthenticator } from "~/services/builder-auth.server";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import { lazy } from "react";
import { ClientOnly } from "~/shared/client-only";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import { isBuilder } from "~/shared/router-utils";

const SessionError = z.object({
  message: z.string(),
  description: z.string().optional(),
});

export const meta: MetaFunction<typeof loader> = () => {
  const metas: ReturnType<MetaFunction> = [];

  metas.push({ title: "Webstudio Error" });

  return metas;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  preventCrossOriginCookie(request);

  const storage = isBuilder(request) ? builderSessionStorage : sessionStorage;
  const sessionErrorKey = isBuilder(request)
    ? builderAuthenticator.sessionErrorKey
    : authenticator.sessionErrorKey;

  const session = await storage.getSession(request.headers.get("Cookie"));

  const rawError = session.get(sessionErrorKey);

  const parsedError = SessionError.safeParse(rawError);

  const error = parsedError.success
    ? parsedError.data
    : {
        message: "Unknown error",
        description: "",
      };

  if (false === parsedError.success) {
    console.error(fromError(parsedError.error));
  }

  return json(
    { error, origin: getAuthorizationServerOrigin(request.url) },
    // remove flash message from session
    {
      headers: {
        "Set-Cookie": await storage.commitSession(session),
      },
    }
  );
};

const ErrorPage = lazy(async () => {
  const { ErrorPage } = await import("~/shared/error/error-page.client");
  return { default: ErrorPage };
});

/**
 * @todo Implement the error page
 */
const Error = () => {
  const data = useLoaderData<typeof loader>();

  return (
    <ClientOnly>
      <ErrorPage error={data.error} onCloseNavigateTo={data.origin} />
    </ClientOnly>
  );
};

export default Error;
