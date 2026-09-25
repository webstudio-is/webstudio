import { z } from "zod";
import { validatePathnamePattern } from "../url-pattern";

// Keep fallback defaults in sync with the Cloud dispatcher.
export const responseHeaderDefinitions = [
  {
    name: "Content-Security-Policy",
    defaultValue: "frame-ancestors 'self'",
  },
  { name: "X-Frame-Options", defaultValue: "SAMEORIGIN" },
  {
    name: "Referrer-Policy",
    defaultValue: "strict-origin-when-cross-origin",
  },
] as const;

const platformHeaderNames = new Set([
  "x-powered-by",
  "x-content-type-options",
  "strict-transport-security",
]);

// Static route rules must not customize cookies, connection state, or values
// that describe the actual response body and status.
export const forbiddenCustomResponseHeaderNames = [
  "cookie",
  "cookie2",
  "set-cookie",
  "set-cookie2",
  "connection",
  "keep-alive",
  "proxy-connection",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "http2-settings",
  "content-length",
  "content-encoding",
  "content-range",
  "proxy-authenticate",
  "proxy-authentication-info",
] as const;

const forbiddenCustomHeaderNames = new Set<string>(
  forbiddenCustomResponseHeaderNames
);

export type ResponseHeaderDefinition =
  (typeof responseHeaderDefinitions)[number];

export const getResponseHeaderDefinition = (name: string) =>
  responseHeaderDefinitions.find(
    (header) => header.name.toLowerCase() === name.toLowerCase()
  );

export const customResponseHeader = z.object({
  // Omitted route is the site-wide setting used by existing projects.
  route: z
    .string()
    .max(2048)
    .refine(
      (route) => validatePathnamePattern(route) === undefined,
      "Invalid route"
    )
    .optional(),
  name: z
    .string()
    .max(256, "Header name must be at most 256 characters")
    .regex(/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/, "Enter a valid HTTP header name")
    .refine(
      (name) => !platformHeaderNames.has(name.toLowerCase()),
      "This header is managed by Webstudio Cloud"
    )
    .refine(
      (name) => !forbiddenCustomHeaderNames.has(name.toLowerCase()),
      "This response header cannot be customized"
    ),
  value: z
    .string()
    .min(1, "Header value cannot be empty")
    .max(8192, "Header value must be at most 8192 characters")
    // Unlike $ alone, the final assertion also rejects a trailing newline.
    .regex(
      /^[\t\x20-\x7e\x80-\xff]*$(?![\s\S])/,
      "Header values cannot contain newlines, control characters, or Unicode outside Latin-1"
    )
    .refine((value) => value.trim().length > 0, "Header value cannot be empty"),
});

export const customResponseHeaders = z
  .array(customResponseHeader)
  .max(100, "At most 100 response header rules are supported")
  .superRefine((headers, context) => {
    const names = new Set<string>();
    let size = 0;
    for (const [index, header] of headers.entries()) {
      const name = `${header.route ?? "/*"}\0${header.name.toLowerCase()}`;
      if (names.has(name)) {
        context.addIssue({
          code: "custom",
          path: [index, "name"],
          message: "This header is already configured for this route",
        });
      }
      names.add(name);
      size +=
        (header.route?.length ?? 0) +
        header.name.length +
        header.value.length +
        4;
    }
    if (size > 16384) {
      context.addIssue({
        code: "custom",
        message: "Response headers must total at most 16 KB",
      });
    }
  });

export type CustomResponseHeader = z.infer<typeof customResponseHeader>;

export const customResponseHeaderKey = ({
  route,
  name,
}: Pick<CustomResponseHeader, "route" | "name">) =>
  `${route ?? "/*"}\0${name.toLowerCase()}`;

export const editCustomResponseHeaders = (
  headers: readonly CustomResponseHeader[],
  key: string,
  next?: CustomResponseHeader
) => {
  const updated = headers.filter(
    (header) => customResponseHeaderKey(header) !== key
  );
  if (next !== undefined) {
    updated.unshift(next);
  }
  return customResponseHeaders.parse(updated);
};

// Explicitly setting a fallback default is not a Pro customization.
export const hasCustomResponseHeaders = (
  headers: readonly CustomResponseHeader[] = []
) =>
  headers.some(({ route, name, value }) => {
    const definition = getResponseHeaderDefinition(name);
    return (
      (route !== undefined && route !== "/*") ||
      definition === undefined ||
      value.trim() !== definition.defaultValue
    );
  });
