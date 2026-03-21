import type { TrpcInterfaceClient } from "../shared/shared-router";
import type { Client } from "@webstudio-is/postgrest/index.server";
import type { UserPurchase } from "../shared/user-plan-features";

/**
 * All necessary parameters for Authorization
 */
type AuthorizationContext =
  | {
      type: "user";
      /**
       * userId of the current authenticated user
       */
      userId: string;
      sessionCreatedAt: number;
      /**
       * Has projectId in the tracked sessions
       */
      isLoggedInToBuilder: (projectId: string) => Promise<boolean>;
    }
  | {
      type: "token";
      /**
       * token URLSearchParams or hostname
       */
      authToken: string;

      /**
       * In case of authToken, this is the ownerId of the project
       */
      ownerId: string;
    }
  | {
      type: "service";
      /**
       * Allow service 2 service communications to skip authorization for view calls
       */
      isServiceCall: boolean;
    }
  | {
      type: "anonymous";
    };

type DomainContext = {
  domainTrpc: TrpcInterfaceClient["domain"];
};

// https://developers.entri.com/docs/install
type EntriContext = {
  entryApi: {
    getEntriToken: () => Promise<{
      token: string;
      applicationId: string;
    }>;
  };
};

type DeploymentContext = {
  deploymentTrpc: TrpcInterfaceClient["deployment"];
  env: {
    BUILDER_ORIGIN: string;
    GITHUB_REF_NAME: string;
    GITHUB_SHA: string | undefined;
    PUBLISHER_HOST: string;
  };
};

type UserPlanFeatures = {
  canDownloadAssets: boolean;
  canRestoreBackups: boolean;
  allowAdditionalPermissions: boolean;
  allowDynamicData: boolean;
  allowContentMode: boolean;
  allowStagingPublish: boolean;
  maxContactEmails: number;
  maxDomainsAllowedPerUser: number;
  maxPublishesAllowedPerUser: number;
  maxWorkspaces: number;
  maxProjectsAllowedPerUser: number;
  /** @deprecated Keep for backward compat — prefer top-level `purchases` */
  purchases: Array<{
    planName: string;
    subscriptionId?: string;
  }>;
};

type TrpcCache = {
  setMaxAge: (path: string, value: number) => void;
  getMaxAge: (path: string) => number | undefined;
};

type PostgrestContext = {
  client: Client;
};

/**
 * AppContext is a global context that is passed to all trpc/api queries/mutations
 * "authorization" is made inside the namespace because eventually there will be
 * logging parameters, potentially "request" cache, etc.
 */
export type AppContext = {
  authorization: AuthorizationContext;
  domain: DomainContext;
  deployment: DeploymentContext;
  entri: EntriContext;
  userPlanFeatures: UserPlanFeatures | undefined;
  purchases: UserPurchase[];
  trpcCache: TrpcCache;
  postgrest: PostgrestContext;
  createTokenContext: (token: string) => Promise<AppContext>;
};
