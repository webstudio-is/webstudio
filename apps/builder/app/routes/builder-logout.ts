import { builderAuthenticator } from "~/services/builder-auth.server";
import { createBuilderLogoutAction } from "~/services/builder-logout-action.server";

export const action = createBuilderLogoutAction((request, options) =>
  builderAuthenticator.logout(request, options)
);
