import { z } from "zod";

/**
 * To facilitate debugging, categorize errors into few types, one is and API-specific errors.
 */
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
    //  If a 429 status code is received and it's not from our API, default to a 1-minute wait time from the current moment.
    return {
      limit: 0,
      remaining: 0,
      reset: Date.now(),
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
