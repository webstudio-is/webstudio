import { readFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import { z } from "zod";
import { printJson } from "../json-output";
import type {
  CommonYargsArgv,
  StrictYargsOptionsToInterface,
} from "./yargs-types";

const registryFileSchema = z.object({
  path: z.string(),
  type: z.string().optional(),
  target: z.string().optional(),
});

const registryItemSchema = z.object({
  name: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  type: z.string().optional(),
  dependencies: z.array(z.string()).optional(),
  devDependencies: z.array(z.string()).optional(),
  registryDependencies: z.array(z.string()).optional(),
  files: z.array(registryFileSchema).optional(),
  docs: z.unknown().optional(),
});

const registrySchema = z.object({
  items: z.array(registryItemSchema).optional(),
});

type RegistryItem = z.infer<typeof registryItemSchema>;

type RegistryDependencies = {
  readFile: (source: string, encoding: "utf8") => Promise<string>;
  fetch: (source: string) => Promise<{
    ok: boolean;
    status: number;
    text: () => Promise<string>;
  }>;
};

const defaultDependencies: RegistryDependencies = {
  readFile: (source, encoding) => readFile(source, encoding),
  fetch: async (source) => fetch(source),
};

const isRemoteSource = (source: string) => /^https?:\/\//i.test(source);

const parseRegistryJson = (source: string, content: string) => {
  try {
    return JSON.parse(content) as unknown;
  } catch {
    throw new Error(`Registry source ${source} is not valid JSON.`);
  }
};

const readRegistrySource = async ({
  source,
  dependencies,
}: {
  source: string;
  dependencies: RegistryDependencies;
}) => {
  if (isRemoteSource(source)) {
    const response = await dependencies.fetch(source);
    if (response.ok === false) {
      throw new Error(
        `Could not read registry source ${source}: HTTP ${response.status}.`
      );
    }
    return parseRegistryJson(source, await response.text());
  }
  return parseRegistryJson(source, await dependencies.readFile(source, "utf8"));
};

const getItemSource = ({ source, item }: { source: string; item: string }) => {
  if (isRemoteSource(source)) {
    return new URL(`${item}.json`, source).toString();
  }
  const absoluteSource = isAbsolute(source) ? source : resolve(source);
  return resolve(dirname(absoluteSource), `${item}.json`);
};

const parseRegistryItem = (source: string, value: unknown) => {
  const parsed = registryItemSchema.safeParse(value);
  if (parsed.success === false) {
    throw new Error(
      `Registry item from ${source} is invalid: ${parsed.error.issues[0]?.message ?? "unknown error"}.`
    );
  }
  return parsed.data;
};

const serializeRegistryItem = ({
  source,
  item,
}: {
  source: string;
  item: RegistryItem;
}) => ({
  source,
  name: item.name,
  title: item.title,
  description: item.description,
  type: item.type,
  dependencies: item.dependencies ?? [],
  devDependencies: item.devDependencies ?? [],
  registryDependencies: item.registryDependencies ?? [],
  files: (item.files ?? []).map((file) => ({
    path: file.path,
    target: file.target,
    type: file.type,
  })),
  docs: item.docs,
});

const getCompatibilityReport = (item: RegistryItem) => ({
  status: "unsupported" as const,
  installation: {
    status: "unsupported" as const,
    reason:
      "Webstudio does not install external shadcn registry files into a project.",
  },
  conversion: {
    status: "unsupported" as const,
    reason:
      "Webstudio does not convert external React registry files into editable Webstudio components yet.",
  },
  requirements: {
    dependencies: item.dependencies ?? [],
    devDependencies: item.devDependencies ?? [],
    registryDependencies: item.registryDependencies ?? [],
  },
  sourceCode: {
    status: "not-analyzed" as const,
    reason:
      "Inspecting registry metadata does not execute or analyze arbitrary external source files.",
  },
  manualSteps: [
    "Use the item metadata as a reference to recreate the UI with Webstudio components and styles.",
  ],
});

const serializeRegistryInspection = ({
  source,
  item,
}: {
  source: string;
  item: RegistryItem;
}) => ({
  ...serializeRegistryItem({ source, item }),
  compatibility: getCompatibilityReport(item),
});

export const inspectRegistry = async (
  options: { source: string; item?: string },
  dependencies: RegistryDependencies = defaultDependencies
) => {
  const sourceValue = await readRegistrySource({
    source: options.source,
    dependencies,
  });
  const directItem = registryItemSchema.safeParse(sourceValue);
  const registry = registrySchema.safeParse(sourceValue);
  if (
    directItem.success &&
    (registry.success === false || registry.data.items === undefined)
  ) {
    if (options.item !== undefined && options.item !== directItem.data.name) {
      throw new Error(
        `Registry source ${options.source} contains item ${directItem.data.name}, not ${options.item}.`
      );
    }
    return serializeRegistryInspection({
      source: options.source,
      item: directItem.data,
    });
  }

  if (registry.success === false || registry.data.items === undefined) {
    throw new Error(
      `Registry source ${options.source} is not an item. Pass --item <name> with a registry index.`
    );
  }
  if (options.item === undefined) {
    throw new Error(
      `Registry source ${options.source} contains multiple items. Pass --item <name>.`
    );
  }
  const indexedItem = registry.data.items.find(
    (item) => item.name === options.item
  );
  if (indexedItem === undefined) {
    throw new Error(
      `Registry item ${options.item} was not found in ${options.source}.`
    );
  }
  if (indexedItem.files !== undefined) {
    return serializeRegistryInspection({
      source: options.source,
      item: indexedItem,
    });
  }
  const itemSource = getItemSource({
    source: options.source,
    item: options.item,
  });
  return serializeRegistryInspection({
    source: itemSource,
    item: parseRegistryItem(
      itemSource,
      await readRegistrySource({ source: itemSource, dependencies })
    ),
  });
};

export const registryInspectOptions = (yargs: CommonYargsArgv) =>
  yargs
    .option("source", {
      type: "string",
      describe:
        "Required local registry JSON path or remote registry/item URL. No files are installed; output includes a read-only compatibility report.",
      demandOption: true,
    })
    .option("item", {
      type: "string",
      describe:
        "Registry item name when --source is a registry index, for example button",
    })
    .option("json", {
      type: "boolean",
      describe: "Print machine-readable JSON output",
      default: false,
    })
    .example(
      "$0 registry inspect --source https://example.com/r/registry.json --item button --json",
      "Inspect a remote shadcn registry item without installing it"
    );

type RegistryOptions = StrictYargsOptionsToInterface<
  typeof registryInspectOptions
>;

export const registryInspect = async (options: RegistryOptions) => {
  const data = await inspectRegistry({
    source: options.source,
    item: options.item,
  });
  if (options.json) {
    printJson({ ok: true, data, meta: { command: "registry inspect" } });
    return;
  }
  console.info(JSON.stringify(data, undefined, 2));
};
