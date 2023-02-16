import { z, type ZodType } from "zod";

const MIN_TITLE_LENGTH = 2;

const Title = z
  .string()
  .refine(
    (val) => val.length >= MIN_TITLE_LENGTH,
    `Minimum ${MIN_TITLE_LENGTH} characters required`
  );

const commonPageFields = {
  id: z.string(),
  name: z.string().refine((val) => val !== "", "Can't be empty"),
  title: Title,
  meta: z.record(z.string(), z.string()),
  treeId: z.string(),
} as const;

const HomePage = z.object({
  ...commonPageFields,
  path: z
    .string()
    .refine((path) => path === "", "Home page path must be empty"),
});

export const pathValidators = (
  baseValidator: ZodType<string>
): ZodType<string> =>
  baseValidator
    .refine((path) => path !== "", "Can't be empty")
    .refine((path) => path !== "/", "Can't be just a /")
    .refine(
      (path) => path === "" || path.startsWith("/"),
      "Must start with a /"
    )
    .refine((path) => path.endsWith("/") === false, "Can't end with a /")
    .refine(
      (path) => path.includes("//") === false,
      "Can't contain repeating /"
    )
    .refine(
      (path) => /^[-_a-z0-9\\/]*$/.test(path),
      "Only a-z, 0-9, -, _ and / are allowed"
    )
    .refine(
      // We use /s for our system stuff like /s/css or /s/uploads
      (path) => path !== "/s" && path.startsWith("/s/") === false,
      "/s prefix is reserved for the system"
    )
    .refine(
      // Remix serves build artefacts like JS bundles from /build
      // And we cannot customize it due to bug in Remix: https://github.com/remix-run/remix/issues/2933
      (path) => path !== "/build" && path.startsWith("/build/") === false,
      "/build prefix is reserved for the system"
    );

const Page = z.object({
  ...commonPageFields,
  path: pathValidators(z.string()),
});

export type Page = z.infer<typeof Page>;

export const Pages: z.ZodType<{ homePage: Page; pages: Array<Page> }> =
  z.object({
    homePage: HomePage,
    pages: z
      .array(Page)
      .refine(
        (array) =>
          new Set(array.map((page) => page.path)).size === array.length,
        "All paths must be unique"
      ),
  });

export type Pages = z.infer<typeof Pages>;
