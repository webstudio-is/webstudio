import { z } from "zod";

// These headers describe the transport or carry platform/session state. They
// cannot be configured as static, project-wide response headers.
const managedHeaders = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "set-cookie",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

export const customResponseHeader = z.object({
  // Unlike $ alone, the final assertion also rejects a trailing newline.
  name: z
    .string()
    .min(1, "Header name is required")
    .max(256, "Header name must be at most 256 characters")
    .regex(
      /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$(?![\s\S])/,
      "Invalid HTTP header name"
    )
    .refine(
      (name) =>
        !managedHeaders.has(name.toLowerCase()) &&
        !name.toLowerCase().startsWith("x-webstudio-"),
      "This header is managed by Webstudio or the HTTP server"
    ),
  // null explicitly removes a header; an empty string sets an empty value.
  value: z
    .string()
    .max(8192, "Header value must be at most 8192 characters")
    .regex(
      /^[\t\x20-\x7e\x80-\xff]*$(?![\s\S])/,
      "Header values cannot contain newlines, control characters, or Unicode outside Latin-1"
    )
    .nullable(),
});

export const customResponseHeaders = z
  .array(customResponseHeader)
  .max(50, "At most 50 custom headers are allowed")
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
        message: "Custom headers must total at most 16 KB",
      });
    }
  });

export type CustomResponseHeader = z.infer<typeof customResponseHeader>;
