import { z } from "zod";
import { WsEmbedTemplate } from "@webstudio-is/sdk";

export const name = "template-generator";

export const Context = z.object({
  // The prompt provides the original user request.
  prompt: z.string(),
  components: z.array(z.string()),
});
export type Context = z.infer<typeof Context>;

export const Response = WsEmbedTemplate;
export type Response = z.infer<typeof Response>;
