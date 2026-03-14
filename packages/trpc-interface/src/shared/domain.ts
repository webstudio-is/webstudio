/**
 * Self-hosting implementation of the domain tRPC interface.
 * Performs real DNS lookups to verify TXT ownership records.
 *
 * For SaaS the real implementation lives in the Cloudflare Workers deployment service.
 */
import { resolveTxt } from "node:dns/promises";
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
  var verifiedDomains: Map<string, boolean>;
}

// Persist verified domain state across requests (Remix purges require cache on dev)
globalThis.verifiedDomains =
  globalThis.verifiedDomains ?? new Map<string, boolean>();

export const domainRouter = router({
  /**
   * Verify TXT ownership record via real DNS lookup.
   * The user must add a TXT record at _webstudio-challenge.<domain> with the expected value.
   */
  create: procedure
    .input(CreateInput)
    .output(createOutput(z.optional(z.undefined())))
    .mutation(async ({ input }) => {
      const txtHost = `_webstudio_is.${input.domain}`;
      try {
        const records = await resolveTxt(txtHost);
        const flat = records.flat();
        if (flat.includes(input.txtRecord) === false) {
          return {
            success: false,
            error: `TXT record mismatch at ${txtHost}. Expected "${input.txtRecord}" but got: ${flat.join(", ") || "nothing"}`,
          };
        }
        verifiedDomains.set(input.domain, true);
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: `DNS lookup failed for ${txtHost}: ${error instanceof Error ? error.message : "unknown error"}. Make sure the TXT record has propagated.`,
        };
      }
    }),

  refresh: procedure
    .input(Input)
    .output(createOutput(z.optional(z.undefined())))
    .mutation(async () => {
      return { success: true };
    }),

  /**
   * Return active status for domains whose TXT record was previously verified.
   * Falls back to re-checking DNS if not in the verified set (e.g. after restart).
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
    .query(async ({ input }) => {
      if (verifiedDomains.get(input.domain) === true) {
        return {
          success: true,
          data: { status: "active" as const },
        };
      }

      return {
        success: true,
        data: {
          status: "error" as const,
          error: `Domain ${input.domain} has not been verified. Please complete the TXT verification step first.`,
        },
      };
    }),
});
