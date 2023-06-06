/**
 * Localhost implementation of the dashboard trpc interface
 * It's playground, and just emulates real 3rd party apis
 */
import { z } from "zod";
import { router, procedure } from "./trpc";

const CreateInput = z.object({ domain: z.string(), txtRecord: z.string() });
const Input = z.object({ domain: z.string() });

const createOutput = <T extends z.ZodType>(data: T) =>
  z.discriminatedUnion("success", [
    z.object({ success: z.literal(true), data }),
    z.object({ success: z.literal(false), error: z.string() }),
  ]);

declare global {
  // eslint-disable-next-line no-var
  var dnsTxtEntries: Map<string, string>;
  // eslint-disable-next-line no-var
  var domainStates: Map<string, "active" | "pending" | "error">;
}

// Remix purges require module cache on every request in development,
// this is the way to persist data between requests in development
globalThis.dnsTxtEntries =
  globalThis.dnsTxtEntries ?? new Map<string, string>();
globalThis.domainStates =
  globalThis.domainStates ?? new Map<string, "active" | "pending">();

export const domainRouter = router({
  /**
   * Verify TXT record and add custom domain entry to DNS
   */
  create: procedure
    .input(CreateInput)
    .output(createOutput(z.optional(z.undefined())))
    .mutation(async ({ input, ctx }) => {
      const record = dnsTxtEntries.get(input.domain);
      if (record !== input.txtRecord) {
        // Return an error once then update the record
        dnsTxtEntries.set(input.domain, input.txtRecord);

        return {
          success: false,
          error: `TXT record does not match, expected "${
            input.txtRecord
          }" but got "${record ?? "undefined"}"`,
        };
      }

      domainStates.set(input.domain, "pending");

      return { success: true };
    }),

  refresh: procedure
    .input(Input)
    .output(createOutput(z.optional(z.undefined())))
    .mutation(async ({ input, ctx }) => {
      return { success: true };
    }),
  /**
   * Get status of verified domain
   */
  getStatus: procedure
    .input(Input)
    .output(
      createOutput(
        z.discriminatedUnion("status", [
          z.object({ status: z.enum(["active", "pending"]) }),
          z.object({ status: z.enum(["error"]), error: z.string() }),
        ])
      )
    )
    .query(async ({ input, ctx }) => {
      const domainState = domainStates.get(input.domain);

      if (domainState === undefined) {
        domainStates.set(input.domain, "pending");

        return {
          success: false,
          error: `Domain ${input.domain} is not active`,
        };
      }

      if (domainState === "active") {
        setTimeout(() => {
          domainStates.set(input.domain, "error");
        });
      }

      if (domainState === "pending" || domainState === "error") {
        setTimeout(() => {
          domainStates.set(input.domain, "active");
        }, 5000);
      }

      if (domainState === "error") {
        return {
          success: true,
          data: {
            status: "error",
            error: "Domain cname verification failed",
          },
        };
      }

      return {
        success: true,
        data: {
          status: domainState,
        },
      };
    }),
});
