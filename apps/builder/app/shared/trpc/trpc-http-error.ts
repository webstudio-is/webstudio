const isJsonContentType = (contentType: string) => {
  const mediaType = contentType.split(";", 1)[0]?.trim().toLowerCase();
  return mediaType === "application/json" || mediaType?.endsWith("+json");
};

export class TrpcHttpError extends Error {
  status: number;
  platformError: string | undefined;
  requestId: string | undefined;
  retryAfter: string | undefined;
  contentType: string | undefined;

  constructor(response: Response) {
    const platformError = response.headers.get("x-vercel-error") ?? undefined;
    const statusMessage = response.ok
      ? "Expected a JSON response"
      : `Request failed with status ${response.status}`;

    super(
      platformError === undefined
        ? statusMessage
        : `${statusMessage} (${platformError})`
    );
    this.name = "TrpcHttpError";
    this.status = response.status;
    this.platformError = platformError;
    this.requestId = response.headers.get("x-vercel-id") ?? undefined;
    this.retryAfter = response.headers.get("retry-after") ?? undefined;
    this.contentType = response.headers.get("content-type") ?? undefined;
  }
}

export const ensureTrpcJsonResponse = (response: Response) => {
  if (isJsonContentType(response.headers.get("content-type") ?? "")) {
    return;
  }
  throw new TrpcHttpError(response);
};
