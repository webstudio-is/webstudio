import { createCookieSessionStorage } from "@remix-run/node";
import env from "~/env/env.server";

export const builderSessionStorage = createCookieSessionStorage({
  cookie: {
    name: "_builder_session", // use any name you want here
    sameSite: "lax", // this helps with CSRF
    path: "/", // remember to add this so the cookie will work in all routes
    httpOnly: true, // for security reasons, make this cookie http only
    secrets: env.AUTH_SECRET ? [env.AUTH_SECRET] : undefined, // replace this with an actual secret
    secure: true,
  },
});
