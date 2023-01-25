import type { TrpcInterfaceClient } from "../shared/shared-router";

type AuthorizationContext = {
  // Used for canvas access inside the designer
  readToken: { projectId: string } | undefined;
  // Check if user is allowed to access the project
  userId: string | undefined;
  // Check if special link with token allows to access the project
  token: string | undefined;
  // Pass trpcClient through context as only main app can initialize it
  authorizeTrpc: TrpcInterfaceClient["authorize"];
};

// Would be used for logging authorization etc
export type AppContext = {
  authorization: AuthorizationContext;
};
