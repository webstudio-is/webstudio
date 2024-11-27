import { z } from "zod";
import { MAX_UPLOAD_SIZE } from "./constants";
import { toBytes } from "./utils/to-bytes";

export const MaxSize: z.ZodEffects<
  z.ZodDefault<z.ZodString>,
  number,
  string | undefined
> = z
  .string()
  .default(MAX_UPLOAD_SIZE)
  // user inputs the max value in mb and we transform it to bytes
  .transform(toBytes);

export const MaxAssets: z.ZodEffects<
  z.ZodDefault<z.ZodString>,
  number,
  string | undefined
> = z.string().default("50").transform(Number.parseFloat);
