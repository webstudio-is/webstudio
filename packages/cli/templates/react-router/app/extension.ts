import "react-router";


declare module "react-router" {
  interface AppLoadContext {
    EXCLUDE_FROM_SEARCH: boolean;
    WEBSTUDIO_AUTOMATION_TOKEN?: string;
  }
}
