import { createCookie } from "@remix-run/node";
import env from "~/env/env.server";
import { dashboardPath } from "~/shared/router-utils";

export const returnToCookie = createCookie("returnTo", {
  path: "/",
  httpOnly: true,
  sameSite: "lax",
  maxAge: 60 * 5, // 5 minutes because it makes no sense to keep it for a long time
  secure: env.SECURE_COOKIE,
});

export const returnToPath = async (request: Request) => {
  const returnTo =
    (await returnToCookie.parse(request.headers.get("Cookie"))) ??
    dashboardPath();

  return returnTo;
};
