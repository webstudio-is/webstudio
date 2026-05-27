import type { WsAuthRoute } from "@webstudio-is/wsauth";

export const authRoutes: WsAuthRoute[] = [
  {
    route: "/",
    auth: {
      method: "basic",
      login: "admin",
      password: "secret",
      credentials: "admin:secret",
    },
  },
];
