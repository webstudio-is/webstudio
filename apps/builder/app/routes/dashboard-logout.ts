import { json } from "@remix-run/server-runtime";
import { authenticator } from "~/services/auth.server";
import { isDashboard, loginPath } from "~/shared/router-utils";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import { type ActionFunctionArgs } from "react-router-dom";
import { checkCsrf } from "~/services/csrf-session.server";
import { isRedirectResponse } from "@remix-run/server-runtime/dist/responses";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    if (false === isDashboard(request)) {
      throw new Response("Not found", {
        status: 404,
      });
    }

    preventCrossOriginCookie(request);
    await checkCsrf(request);

    const redirectTo = loginPath({});

    await authenticator.logout(request, {
      redirectTo,
    });
  } catch (error) {
    if (error instanceof Response && isRedirectResponse(error)) {
      const headers = new Headers();

      if (error.headers.get("Set-Cookie")) {
        headers.set("Set-Cookie", error.headers.get("Set-Cookie")!);
      }

      headers.set("Content-Type", "application/json");

      return json(
        {
          redirectTo: error.headers.get("Location"),
        },
        {
          headers,
        }
      );
    }

    return error;
  }
};
