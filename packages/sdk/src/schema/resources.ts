import { z } from "zod";

const resourceId = z.string();

const method = z.union([
  z.literal("get"),
  z.literal("post"),
  z.literal("put"),
  z.literal("delete"),
]);

const bodyFormat = z.enum(["auto", "json", "multipart"]);

// Missing fields inherit the published Project Emails settings. Configured
// recipient and Sender values must be nonempty, and subject and body overrides
// must be valid, nonempty expressions.
export const emailResourceSettings = z.object({
  recipientMode: z.enum(["project", "custom", "visitor"]).optional(),
  recipients: z.string().optional(),
  visitorEmailField: z.string().optional(),
  sender: z.string().optional(),
  senderExpression: z.string().optional(),
  recipientsExpression: z.string().optional(),
  subject: z.string().optional(),
  body: z.string().optional(),
  includeAttachments: z.boolean().optional(),
});
export type EmailResourceSettings = z.infer<typeof emailResourceSettings>;

export const emailRequestSettings = z.object({
  recipientMode: z.enum(["project", "custom", "visitor"]),
  visitorEmailField: z.string().optional(),
  recipients: z.array(
    z.object({ name: z.string().optional(), address: z.string() })
  ),
  sender: z
    .object({ name: z.string().optional(), address: z.string() })
    .optional(),
  fromName: z.string().optional(),
  subject: z.string(),
  body: z.string(),
  includeAttachments: z.boolean(),
});

export const resource = z.object({
  id: resourceId,
  name: z.string(),
  control: z.optional(
    z.union([z.literal("system"), z.literal("graphql"), z.literal("email")])
  ),
  email: emailResourceSettings.optional(),
  method: method,
  // expression
  url: z.string(),
  searchParams: z
    .array(
      z.object({
        name: z.string(),
        // expression
        value: z.string(),
      })
    )
    .optional(),
  headers: z.array(
    z.object({
      name: z.string(),
      // expression
      value: z.string(),
    })
  ),
  // expression
  body: z.optional(z.string()),
  bodyFormat: bodyFormat.optional(),
});

export type Resource = z.infer<typeof resource>;

// evaluated variant of resource
export const resourceRequest = z.object({
  name: z.string(),
  control: z.optional(
    z.union([z.literal("system"), z.literal("graphql"), z.literal("email")])
  ),
  email: emailRequestSettings.optional(),
  method: method,
  url: z.string(),
  searchParams: z.array(
    z.object({
      name: z.string(),
      // can be string or object which should be serialized
      value: z.unknown(),
    })
  ),
  headers: z.array(
    z.object({
      name: z.string(),
      // can be string or object which should be serialized
      value: z.unknown(),
    })
  ),
  body: z.optional(z.unknown()),
  bodyFormat: bodyFormat.optional(),
});

export type ResourceRequest = z.infer<typeof resourceRequest>;

export const resources = z.map(resourceId, resource);

export type Resources = z.infer<typeof resources>;
