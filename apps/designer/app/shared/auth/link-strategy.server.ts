import { AppLoadContext, SessionStorage } from "@remix-run/server-runtime";
import {
  AuthenticateOptions,
  Strategy,
  StrategyVerifyCallback,
} from "remix-auth";
import * as jose from "jose";
import { webcrypto as crypto } from "node:crypto";
import { z } from "zod";

const TokenPayload = z.object({ userId: z.string() });

export interface LinkStrategyVerifyParams {
  userId: string;
  /**
   * An object of arbitrary for route loaders and actions provided by the
   * server's `getLoadContext()` function.
   */
  context?: AppLoadContext;
}

const getSecretKey = async (secret: string) => {
  const secretBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(secret)
  );

  return new Uint8Array(secretBuffer);
};

type LinkStrategyOptions = {
  secret: string;
  tokenSearchParamName: string;
};

export class LinkStrategy<User> extends Strategy<
  User,
  LinkStrategyVerifyParams
> {
  private options: LinkStrategyOptions;

  name = "link";

  createTokenSearchParams = async (
    userId: string,
    maxAge: "5s" | "10s" | "1m"
  ) => {
    const secret = await getSecretKey(this.options.secret);

    const jwt = await new jose.EncryptJWT({ userId })
      .setProtectedHeader({ alg: "dir", enc: "A128CBC-HS256" })
      .setIssuedAt()
      .setExpirationTime(maxAge)
      .encrypt(secret);

    const urlSearchParams = new URLSearchParams({
      [this.options.tokenSearchParamName]: jwt,
    });

    return urlSearchParams;
  };

  constructor(
    options: LinkStrategyOptions,
    verify: StrategyVerifyCallback<User, LinkStrategyVerifyParams>
  ) {
    super(verify);
    this.options = options;
  }

  async authenticate(
    request: Request,
    sessionStorage: SessionStorage,
    options: AuthenticateOptions
  ): Promise<User> {
    try {
      const secret = await getSecretKey(this.options.secret);
      // const decripted = await jose.jwtDecrypt(jwt, secret);
      const url = new URL(request.url);
      const token = url.searchParams.get(this.options.tokenSearchParamName);

      if (token == null) {
        throw new Error("Token not found in url");
      }

      const decriptedJwt = await jose.jwtDecrypt(token, secret);
      const { userId } = TokenPayload.parse(decriptedJwt.payload);
      const user = await this.verify({ userId, context: options.context });

      return this.success(user, request, sessionStorage, options);
    } catch (error) {
      if (error instanceof Error) {
        return await this.failure(
          error.message,
          request,
          sessionStorage,
          options,
          error
        );
      }

      if (typeof error === "string") {
        return await this.failure(
          error,
          request,
          sessionStorage,
          options,
          new Error(error)
        );
      }

      return await this.failure(
        "Unknown error",
        request,
        sessionStorage,
        options,
        new Error(JSON.stringify(error, null, 2))
      );
    }
  }
}
