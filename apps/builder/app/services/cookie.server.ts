import { createCookie } from "@remix-run/node";
import { dashboardPath } from "~/shared/router-utils";

export const returnToCookie = createCookie("returnTo", {
  path: "/",
  httpOnly: true,
  sameSite: "lax",
  maxAge: 60, // 1 minute because it makes no sense to keep it for a long time
  secure: process.env.NODE_ENV === "production",
});

export const returnToPath = async (request: Request) => {
  const returnTo =
    (await returnToCookie.parse(request.headers.get("Cookie"))) ??
    dashboardPath();

  return returnTo;
};
