import type { TrpcInterfaceClient } from "../shared/shared-router";

// Would be used for logging authorization etc
export type Context = {
  authorization: AuthorizationContext;
};

export type AuthorizationContext = {
  // Used for canvas access inside the designer
  readToken: { projectId: string } | undefined;
  // Check if user is allowed to access the project
  userId: string | undefined;
  // Check if special link with token allows to access the project
  token: string | undefined;

  authorizeTrpc: TrpcInterfaceClient["authorize"];
};
