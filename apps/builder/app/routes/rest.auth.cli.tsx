import { json, redirect, type LoaderArgs } from "@remix-run/node";
import { sentryException } from "~/shared/sentry";

export const loader = async ({ request }: LoaderArgs) => {
  try {
    const currentUrl = new URL(request.url);
    const returnTo = currentUrl.searchParams.get("returnTo");
    if (!returnTo) {
      return {
        message: "Where are you going?",
      };
    }
    const returnToUrl = new URL(returnTo);
    const cookies = request.headers.get("Cookie");
    const _session = cookies
      ?.split(";")
      .find((c) => c.trim().startsWith("_session="))
      ?.split("=")[1];
    if (!_session) {
      return redirect(
        "/login?returnTo=" + currentUrl.pathname + currentUrl.search
      );
    }
    returnToUrl.searchParams.set("token", _session);
    return redirect(returnToUrl.href);
  } catch (error) {
    // If a Response is thrown, we're rethrowing it for Remix to handle.
    // https://remix.run/docs/en/v1/api/conventions#throwing-responses-in-loaders
    if (error instanceof Response) {
      throw error;
    }

    sentryException({ error });

    // We have no idea what happened, so we'll return a 500 error.
    throw json(error instanceof Error ? error.message : String(error), {
      status: 500,
    });
  }
};
