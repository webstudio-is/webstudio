const config = {
  previewPath: "/preview",
  canvasPath: "/canvas",
  designerPath: "/designer",
  dashboardPath: "/dashboard",
  loginPath: "/login",
  logoutPath: "/logout",
  googleCallbackPath: "/google/callback",
  githubCallbackPath: "/github/callback",
  authPath: "/auth",

  defaultUploadPath: "uploads",
};
export default config;
export type Config = typeof config;
