import { createCookieSessionStorage } from "@remix-run/node";

const secrets = process.env.AUTH_SECRET ? [process.env.AUTH_SECRET] : undefined;

// export the whole sessionStorage object
export const sessionStorage = createCookieSessionStorage({
  cookie: {
    maxAge: 60 * 60 * 24 * 30,
    name: "_session", // use any name you want here
    sameSite: "lax", // this helps with CSRF
    path: "/", // remember to add this so the cookie will work in all routes
    httpOnly: true, // for security reasons, make this cookie http only
    secrets, // replace this with an actual secret
    secure: process.env.NODE_ENV === "production", // enable this in prod only
  },
});

// Used for canvas authentication in case if canvas is on a different domain
// Expires on close of the app, shares secrets
export const canvasSessionStorage = createCookieSessionStorage({
  cookie: {
    name: "_session", // same key as for sessionStorage
    path: "/", // same path as for sessionStorage
    httpOnly: true, // same as for sessionStorage
    secrets, // same as for sessionStorage so we can read this session data from sessionStorage
    sameSite: "none", // Must be none otherwise iframe will not save the cookie because of cross site response which is not top level navigation
    secure: true, // Muts be true because of sameSite: none (other values are not allowed)
  },
});

// you can also export the methods individually for your own usage
export const { getSession, commitSession, destroySession } = sessionStorage;
