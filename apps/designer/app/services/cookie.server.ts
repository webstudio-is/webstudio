import { createCookie } from "@remix-run/node";

export const returnToCookie = createCookie("returnTo", {
  path: "/",
  httpOnly: true,
  sameSite: "lax",
  maxAge: 60, // 1 minute because it makes no sense to keep it for a long time
  secure: process.env.NODE_ENV === "production",
});
