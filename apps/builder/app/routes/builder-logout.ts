import { type LoaderFunctionArgs } from "@remix-run/server-runtime";
import { createDebug } from "~/shared/debug";
import { builderAuthenticator } from "~/services/builder-auth.server";
import { getAuthorizationServerOrigin } from "~/shared/router-utils/origins";
import { isBuilder, loginPath } from "~/shared/router-utils";

const debug = createDebug(import.meta.url);

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (false === isBuilder(request)) {
    throw new Error("Only Builder can logout at this endpoint");
  }

  const redirectTo = `${getAuthorizationServerOrigin(request.url)}${loginPath({})}`;

  try {
    debug("Logging out");

    await builderAuthenticator.logout(request, {
      redirectTo,
    });
  } catch (error) {
    if (false === error instanceof Response) {
      return error;
    }

    console.error(error);
    throw error;
  }

  throw new Error("Should not reach this point");
};
