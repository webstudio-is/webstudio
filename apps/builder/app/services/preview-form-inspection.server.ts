import type { ResourceExchange } from "@webstudio-is/sdk/runtime";
import type { PreviewFormExchange } from "~/shared/preview-form-inspection";

const sensitive =
  /authorization|cookie|token|api[-_]?key|secret|password|session|csrf|credential/i;
const publicHeader =
  /^(accept|content-type|content-length|cache-control|expires|date|etag|last-modified|location|vary)$/i;
const redacted = "[redacted]";
const maxBodyLength = 64 * 1024;

export const capturePreviewFormExchange = async (
  resourceId: string,
  exchange: ResourceExchange,
  {
    publicValues,
    privateValues,
    sensitiveFields = new Set(),
    redactAllBody = false,
  }: {
    publicValues: ReadonlySet<string>;
    privateValues: ReadonlySet<string>;
    sensitiveFields?: ReadonlySet<string>;
    redactAllBody?: boolean;
  }
): Promise<PreviewFormExchange> => {
  const secrets = new Set([...privateValues].filter(Boolean));
  const collectCredentials = (headers: Headers) => {
    for (const [name, value] of headers) {
      if (sensitive.test(name) || !publicHeader.test(name)) {
        secrets.add(value);
        if (/authorization/i.test(name)) {
          secrets.add(value.replace(/^\S+\s+/, ""));
        }
        if (/cookie/i.test(name)) {
          for (const cookie of value.split(";")) {
            const index = cookie.indexOf("=");
            if (index >= 0) {
              secrets.add(cookie.slice(index + 1).trim());
            }
          }
        }
      }
    }
  };
  const request = exchange.request;
  const requestHeaders =
    request instanceof Request
      ? request.headers
      : new Headers(
          request.headers.map(({ name, value }) => [name, String(value)])
        );
  collectCredentials(requestHeaders);
  collectCredentials(exchange.response.headers);
  const requestLimit = { truncated: false };
  const responseLimit = { truncated: false };
  type Limit = typeof requestLimit;
  const text = (value: string, limit?: Limit) => {
    for (const secret of secrets) {
      if (secret) {
        value = value.replaceAll(secret, redacted);
      }
    }
    if (value.length > 4096 && limit) {
      limit.truncated = true;
    }
    return value.slice(0, 4096);
  };
  const url = (value: string, limit: Limit, base?: string) => {
    try {
      const parsed = new URL(value, base);
      if (parsed.username) {
        secrets.add(parsed.username);
        parsed.username = redacted;
      }
      if (parsed.password) {
        secrets.add(parsed.password);
        parsed.password = redacted;
      }
      const search = new URLSearchParams();
      for (const [name, value] of parsed.searchParams) {
        if (sensitive.test(name) || sensitiveFields.has(name)) {
          secrets.add(value);
          search.append(name, redacted);
        } else {
          search.append(name, text(value, limit));
        }
      }
      parsed.search = search.toString();
      return text(parsed.href, limit);
    } catch {
      return redacted;
    }
  };
  const safeUrl = url(request.url, requestLimit);
  const finalUrl =
    exchange.response.url === undefined
      ? undefined
      : url(exchange.response.url, responseLimit, request.url);
  const safeHeaders = (headers: Headers, limit: Limit) => {
    if ([...headers].length > 100) {
      limit.truncated = true;
    }
    return [...headers].slice(0, 100).map(([name, value]) => ({
      name,
      value:
        sensitive.test(name) || !publicHeader.test(name)
          ? redacted
          : name.toLowerCase() === "location"
            ? url(value, limit, request.url)
            : text(value, limit),
    }));
  };
  const sanitize = (
    value: unknown,
    outgoing: boolean,
    limit: Limit,
    depth = 0
  ): unknown => {
    if (depth > 8) {
      limit.truncated = true;
      return "[truncated]";
    }
    if (typeof File !== "undefined" && value instanceof File) {
      return {
        name: text(value.name, limit),
        type: text(value.type, limit),
        size: value.size,
      };
    }
    if (Array.isArray(value)) {
      if (value.length > 100) {
        limit.truncated = true;
      }
      return value
        .slice(0, 100)
        .map((value) => sanitize(value, outgoing, limit, depth + 1));
    }
    if (value !== null && typeof value === "object") {
      if (Object.keys(value).length > 100) {
        limit.truncated = true;
      }
      return Object.fromEntries(
        Object.entries(value)
          .slice(0, 100)
          .map(([name, value]) => [
            text(name, limit),
            sensitive.test(name) || sensitiveFields.has(name)
              ? redacted
              : sanitize(value, outgoing, limit, depth + 1),
          ])
      );
    }
    if (outgoing && (redactAllBody || !publicValues.has(String(value)))) {
      return redacted;
    }
    return typeof value === "string" ? text(value, limit) : value;
  };
  const bounded = (value: unknown, outgoing: boolean, limit: Limit) => {
    const body = sanitize(value, outgoing, limit);
    const encoded = JSON.stringify(body) ?? "";
    return encoded.length > maxBodyLength
      ? { body: encoded.slice(0, maxBodyLength) + "…", truncated: true }
      : { body, truncated: limit.truncated };
  };
  let requestBody: unknown;
  if (request instanceof Request) {
    const contentType = request.headers.get("content-type") ?? "";
    if (
      /multipart\/form-data|application\/x-www-form-urlencoded/i.test(
        contentType
      )
    ) {
      const fields = await request.formData();
      const body: Record<string, unknown> = {};
      for (const name of new Set(fields.keys())) {
        const values = fields.getAll(name);
        body[name] = values.length === 1 ? values[0] : values;
      }
      requestBody = body;
    } else {
      const body = await request.text();
      if (/application\/json/i.test(contentType)) {
        try {
          requestBody = JSON.parse(body);
        } catch {
          requestBody = body;
        }
      } else {
        requestBody = body;
      }
    }
  } else {
    requestBody = request.email ?? request.body;
  }
  return {
    resourceId,
    kind: request instanceof Request ? "http" : "email",
    request: {
      method: request.method,
      url: safeUrl,
      headers: safeHeaders(requestHeaders, requestLimit),
      ...bounded(requestBody, true, requestLimit),
    },
    response: {
      status: exchange.response.status,
      statusText: text(exchange.response.statusText, responseLimit),
      url: finalUrl,
      headers: safeHeaders(exchange.response.headers, responseLimit),
      ...bounded(exchange.response.data, false, responseLimit),
    },
  };
};
