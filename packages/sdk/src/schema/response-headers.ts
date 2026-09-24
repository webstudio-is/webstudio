import { z } from "zod";
import { validateWsAuthRoute } from "@webstudio-is/wsauth";

// Keep defaults and required flags in sync with the Cloud hosting template's
// response-header-settings.ts. Missing project settings use these defaults.
export const responseHeaderDefinitions = [
  {
    name: "Content-Security-Policy",
    defaultValue: "frame-ancestors 'self'",
    required: true,
  },
  { name: "X-Frame-Options", defaultValue: "SAMEORIGIN", required: false },
  { name: "X-Content-Type-Options", defaultValue: "nosniff", required: true },
  {
    name: "Referrer-Policy",
    defaultValue: "strict-origin-when-cross-origin",
    required: true,
  },
  {
    name: "Strict-Transport-Security",
    defaultValue: "max-age=63072000; includeSubDomains; preload",
    required: true,
  },
] as const;

export type ResponseHeaderDefinition =
  (typeof responseHeaderDefinitions)[number];

export const getResponseHeaderDefinition = (name: string) =>
  responseHeaderDefinitions.find(
    (header) => header.name.toLowerCase() === name.toLowerCase()
  );

export const customResponseHeader = z
  .object({
    // Omitted route is the site-wide setting used by existing projects.
    route: z
      .string()
      .max(2048)
      .refine(
        (route) => validateWsAuthRoute(route) === undefined,
        "Invalid route"
      )
      .optional(),
    name: z
      .string()
      .max(256, "Header name must be at most 256 characters")
      .refine(
        (name) => /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name),
        "Enter a valid HTTP header name"
      )
      .refine(
        (name) => name.toLowerCase() !== "x-powered-by",
        "X-Powered-By is managed by Webstudio Cloud"
      ),
    value: z
      .string()
      .max(8192, "Header value must be at most 8192 characters")
      // Unlike $ alone, the final assertion also rejects a trailing newline.
      .regex(
        /^[\t\x20-\x7e\x80-\xff]*$(?![\s\S])/,
        "Header values cannot contain newlines, control characters, or Unicode outside Latin-1"
      )
      .refine(
        (value) => value.trim().length > 0,
        "Header value cannot be empty"
      )
      .nullable(),
  })
  .superRefine((header, context) => {
    if (
      header.value === null &&
      getResponseHeaderDefinition(header.name)?.required
    ) {
      context.addIssue({
        code: "custom",
        path: ["value"],
        message: "Required headers cannot be removed",
      });
    }
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
        (header.value?.length ?? 0) +
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

// Persisted defaults, including values supplied through the API, are not a Pro
// customization. Removing an optional header is a customization.
export const hasCustomResponseHeaders = (
  headers: readonly CustomResponseHeader[] = []
) =>
  headers.some(({ route, name, value }) => {
    const definition = getResponseHeaderDefinition(name);
    return (
      (route !== undefined && route !== "/*") ||
      definition === undefined ||
      value?.trim() !== definition.defaultValue
    );
  });

export const getResponseHeaders = (
  headers: readonly CustomResponseHeader[] = []
): CustomResponseHeader[] =>
  responseHeaderDefinitions.map(({ name, defaultValue }) => {
    const configured = headers.find(
      (header) =>
        (header.route === undefined || header.route === "/*") &&
        header.name.toLowerCase() === name.toLowerCase()
    );
    return {
      name,
      value: configured === undefined ? defaultValue : configured.value,
    };
  });
