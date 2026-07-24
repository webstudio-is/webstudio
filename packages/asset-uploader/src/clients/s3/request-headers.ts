import type { SignatureV4 } from "@smithy/signature-v4";

/**
 * SigV4 requires `host` in the canonical signed headers. Fetch supplies the
 * actual Host header from the URL, so sign that exact value but do not attempt
 * to set the transport-controlled header explicitly.
 */
export const createS3SigningHeaders = (
  url: URL,
  headers: Record<string, string>
) => ({ ...headers, host: url.host });

export const createS3FetchHeaders = (headers: Record<string, string>) => {
  const result = new Headers(headers);
  result.delete("host");
  return result;
};

export const signS3Request = async ({
  signer,
  url,
  method,
  headers,
  body,
  query,
}: {
  signer: SignatureV4;
  url: URL;
  method: string;
  headers: Record<string, string>;
  body?: ArrayBuffer | Uint8Array;
  query?: Record<string, string>;
}) =>
  await signer.sign({
    method,
    protocol: url.protocol,
    hostname: url.hostname,
    path: url.pathname,
    ...(query === undefined ? {} : { query }),
    headers: createS3SigningHeaders(url, headers),
    ...(body === undefined ? {} : { body }),
  });
