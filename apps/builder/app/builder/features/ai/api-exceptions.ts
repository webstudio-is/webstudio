import { z } from "zod";

export class AiApiException extends Error {
  constructor(message: string) {
    super(message);
  }
}

const zRateLimit = z.object({
  error: z.object({
    message: z.string(),
    code: z.number(),
    meta: z.object({
      limit: z.number(),
      reset: z.number(),
      remaining: z.number(),
      ratelimitName: z.string(),
    }),
  }),
});

type RateLimitMeta = z.infer<typeof zRateLimit>["error"]["meta"];

export const textToRateLimitMeta = (text: string): RateLimitMeta => {
  try {
    const { error } = zRateLimit.parse(JSON.parse(text));

    return error.meta;
  } catch {
    return {
      limit: 0,
      remaining: 0,
      reset: 0,
      ratelimitName: "unparsed",
    };
  }
};

export class RateLimitException extends Error {
  meta: RateLimitMeta;

  constructor(message: string, meta: RateLimitMeta) {
    super(message);
    this.meta = meta;
  }
}
