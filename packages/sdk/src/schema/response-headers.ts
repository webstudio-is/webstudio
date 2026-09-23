import { z } from "zod";

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
    name: z
      .string()
      .refine(
        (name) => getResponseHeaderDefinition(name) !== undefined,
        "Choose a supported response header"
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
  .max(
    responseHeaderDefinitions.length,
    "At most 5 response headers are supported"
  )
  .superRefine((headers, context) => {
    const names = new Set<string>();
    let size = 0;
    for (const [index, header] of headers.entries()) {
      const name = header.name.toLowerCase();
      if (names.has(name)) {
        context.addIssue({
          code: "custom",
          path: [index, "name"],
          message:
            "This header is already configured (names are case-insensitive)",
        });
      }
      names.add(name);
      size += header.name.length + (header.value?.length ?? 0) + 4;
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
  headers.some(({ name, value }) => {
    const definition = getResponseHeaderDefinition(name);
    return (
      definition === undefined || value?.trim() !== definition.defaultValue
    );
  });

export const getResponseHeaders = (
  headers: readonly CustomResponseHeader[] = []
): CustomResponseHeader[] =>
  responseHeaderDefinitions.map(({ name, defaultValue }) => {
    const configured = headers.find(
      (header) => header.name.toLowerCase() === name.toLowerCase()
    );
    return {
      name,
      value: configured === undefined ? defaultValue : configured.value,
    };
  });
