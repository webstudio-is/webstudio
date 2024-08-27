import type { StrategyVerifyCallback } from "remix-auth";
import {
  OAuth2Strategy,
  type OAuth2Profile,
  type OAuth2StrategyOptions,
  type OAuth2StrategyVerifyParams,
} from "remix-auth-oauth2";
import { AsyncLocalStorage } from "node:async_hooks";

type DynamicProps = "authorizationEndpoint" | "tokenEndpoint" | "redirectURI";

export type OAuth2StrategyOptionsOverrides = Partial<OAuth2StrategyOptions> &
  Pick<OAuth2StrategyOptions, DynamicProps>;

const asyncLocalStorage = new AsyncLocalStorage<
  Partial<OAuth2StrategyOptions>
>();

/**
 * The main issue with OAuth2Strategy is that it forces us to define authorizationEndpoint, tokenEndpoint, and redirectURI
 * at the time of constructing the instance.
 * However, in our case, these values are dynamic because we use multiple domains, such as development, staging, and production.
 * The solution is to wrap the options object with a proxy, retrieving the necessary options from localAsyncStorage and proxying
 * all requests through asyncLocalStorage.run
 */
export class WsStrategy<
  User,
  Profile extends OAuth2Profile = { provider: string },
  ExtraParams extends Record<string, unknown> = Record<string, never>,
> extends OAuth2Strategy<User, Profile, ExtraParams> {
  constructor(
    options: OAuth2StrategyOptions,
    verify: StrategyVerifyCallback<
      User,
      OAuth2StrategyVerifyParams<Profile, ExtraParams>
    >,
    overrideOptions: (request: Request) => OAuth2StrategyOptionsOverrides
  ) {
    super(options, verify);

    this.options = new Proxy<OAuth2StrategyOptions>(this.options, {
      get: (target, property, receiver) => {
        const store = asyncLocalStorage.getStore();
        return (
          store?.[property as keyof OAuth2StrategyOptions] ??
          Reflect.get(target, property, receiver)
        );
      },
    });

    return new Proxy(this, {
      get: function (target, property, receiver) {
        const targetProp = target[property as keyof typeof target];
        if (
          typeof targetProp === "function" &&
          // do not wrap if already wrapped
          asyncLocalStorage.getStore() === undefined
        ) {
          return (...args: unknown[]) => {
            const request = args.find((arg) => arg instanceof Request);

            return asyncLocalStorage.run(
              request ? overrideOptions(request) : {},
              () => {
                return Reflect.apply(targetProp, receiver, args);
              }
            );
          };
        }

        return Reflect.get(target, property, receiver);
      },
    });
  }
}
