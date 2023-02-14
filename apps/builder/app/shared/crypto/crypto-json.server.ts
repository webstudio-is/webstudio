import * as jose from "jose";
import { webcrypto as crypto } from "node:crypto";

const getSecretKey = async (secret: string) => {
  const secretBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(secret)
  );

  return new Uint8Array(secretBuffer);
};

export const encode = async (json: Record<string, unknown>, secret: string) => {
  const secretKey = await getSecretKey(secret);

  const jwt = await new jose.EncryptJWT(json)
    .setProtectedHeader({ alg: "dir", enc: "A128CBC-HS256" })
    .encrypt(secretKey);

  return jwt;
};

export const decode = async (
  token: string,
  secret: string
): Promise<Record<string, unknown>> => {
  const secretKey = await getSecretKey(secret);

  const jwt = await jose.jwtDecrypt(token, secretKey);

  return jwt.payload;
};
