import { cwd } from "node:process";
import { dirname, join } from "node:path";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { kebabCase, sentenceCase } from "change-case";
import type { WsComponentMeta } from "@webstudio-is/sdk";
import type { TemplateMeta } from "@webstudio-is/template";
import {
  webstudioRegistrySchema,
  type WebstudioRegistry,
  type WebstudioRegistryItem,
  type WebstudioRegistryMeta,
} from "./registry-schema";

type ComponentRegistryItem = {
  name: string;
  type: WebstudioRegistryItem["type"];
  title: string;
  description: string;
  source: {
    package: string;
    export: string;
    kind: "component" | "template";
  };
  docs: string;
  component?: {
    name: string;
    category?: WsComponentMeta["category"];
    contentModel?: WsComponentMeta["contentModel"];
    indexWithinAncestor?: WsComponentMeta["indexWithinAncestor"];
    label?: WsComponentMeta["label"];
    description?: WsComponentMeta["description"];
    icon?: WsComponentMeta["icon"];
    presetStyle?: WsComponentMeta["presetStyle"];
    order?: WsComponentMeta["order"];
    initialProps?: WsComponentMeta["initialProps"];
    props?: WsComponentMeta["props"];
    states?: WsComponentMeta["states"];
    composition?: Composition;
  };
  template?: {
    name: string;
    title?: string;
    description?: string;
    category: TemplateMeta["category"];
  };
};

type RegistryArtifacts = {
  registry: WebstudioRegistry;
  docs: Map<string, string>;
};

type Composition = {
  family: string;
  role: NonNullable<WebstudioRegistryMeta["composition"]>["role"];
  tree?: string;
};

const registrySchema = "https://ui.shadcn.com/schema/registry.json";
const registryItemSchema = "https://ui.shadcn.com/schema/registry-item.json";

const normalize = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(normalize);
  }
  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(value)) {
      if (nestedValue !== undefined) {
        result[key] = normalize(nestedValue);
      }
    }
    return result;
  }
  return value;
};

const compactObject = <Value extends Record<string, unknown>>(value: Value) =>
  normalize(value) as Value;

const fileExists = async (path: string) => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

const getTitle = (name: string, meta: WsComponentMeta | TemplateMeta) =>
  meta.label ?? sentenceCase(name);

const getDescription = (title: string, meta: WsComponentMeta | TemplateMeta) =>
  meta.description ?? `${title} Webstudio component.`;

const getDocsBase = (packageName: string) => {
  if (packageName.endsWith("sdk-components-react-radix")) {
    return "radix";
  }
  if (packageName.endsWith("sdk-components-animation")) {
    return "animation";
  }
  return "webstudio";
};

const getLocalComponentName = (
  component: string,
  metas: Map<string, WsComponentMeta>
) => {
  if (metas.has(component)) {
    return component;
  }
  const name = component.includes(":")
    ? component.split(":").at(-1)
    : undefined;
  return name !== undefined && metas.has(name) ? name : undefined;
};

const getLocalContentComponents = (
  meta: WsComponentMeta | undefined,
  metas: Map<string, WsComponentMeta>
) =>
  [
    ...(meta?.contentModel?.children ?? []),
    ...(meta?.contentModel?.descendants ?? []),
  ]
    .map((component) => getLocalComponentName(component, metas))
    .filter(isDefined)
    .filter((component, index, components) => {
      return components.indexOf(component) === index;
    });

const formatCompositionTree = (
  root: string,
  metas: Map<string, WsComponentMeta>
) => {
  const formatChildren = (
    component: string,
    prefix: string,
    path: Set<string>
  ): string[] => {
    const descendants = getLocalContentComponents(
      metas.get(component),
      metas
    ).filter((descendant) => path.has(descendant) === false);
    return descendants.flatMap((descendant, index) => {
      const isLast = index === descendants.length - 1;
      const connector = isLast ? "`-- " : "|-- ";
      const childPath = new Set(path);
      childPath.add(descendant);
      return [
        `${prefix}${connector}${descendant}`,
        ...formatChildren(
          descendant,
          `${prefix}${isLast ? "    " : "|   "}`,
          childPath
        ),
      ];
    });
  };

  return [root, ...formatChildren(root, "", new Set([root]))].join("\n");
};

const inferCompositions = (metas: Map<string, WsComponentMeta>) => {
  const compositions = new Map<string, Composition>();
  for (const [name, meta] of metas) {
    if (meta.contentModel?.category !== "instance") {
      continue;
    }
    if (getLocalContentComponents(meta, metas).length === 0) {
      continue;
    }
    compositions.set(name, {
      family: name,
      role: "root",
      tree: formatCompositionTree(name, metas),
    });
  }

  for (const [family, composition] of compositions) {
    if (composition.role !== "root") {
      continue;
    }
    const visit = (component: string, path: Set<string>) => {
      for (const descendant of getLocalContentComponents(
        metas.get(component),
        metas
      )) {
        if (path.has(descendant)) {
          continue;
        }
        if (compositions.has(descendant) === false) {
          compositions.set(descendant, { family, role: "part" });
        }
        const descendantPath = new Set(path);
        descendantPath.add(descendant);
        visit(descendant, descendantPath);
      }
    };
    visit(family, new Set([family]));
  }

  return compositions;
};

const getRadixFamily = (name: string, composition?: Composition) =>
  composition?.family ?? name;

const isRadixPackage = (packageName: string) =>
  packageName.endsWith("sdk-components-react-radix");

const isDefined = <Value>(value: Value | undefined): value is Value =>
  value !== undefined;

const formatReferences = ({
  packageName,
  radixFamily,
}: {
  packageName: string;
  radixFamily?: string;
}) => {
  const radixDocsUrl =
    isRadixPackage(packageName) && radixFamily !== undefined
      ? `https://www.radix-ui.com/primitives/docs/components/${kebabCase(radixFamily)}`
      : undefined;
  const radixDocsLabel =
    radixFamily === undefined ? undefined : sentenceCase(radixFamily);
  const references = [
    radixDocsUrl && radixDocsLabel
      ? `- [Radix ${radixDocsLabel} documentation](${radixDocsUrl})`
      : undefined,
  ].filter(isDefined);
  if (references.length === 0) {
    return "No external references are currently mapped for this component.";
  }
  return references.join("\n");
};

const formatAccessibility = ({ meta }: { meta: WsComponentMeta }) => {
  const notes = [
    meta.props?.["aria-label"]
      ? "Provide an accessible label when the visible text does not describe the control."
      : undefined,
    meta.props?.alt
      ? "Write alt text that describes the image content or mark decorative images appropriately."
      : undefined,
  ].filter(isDefined);
  if (notes.length === 0) {
    return "Follow Webstudio's semantic component model and preserve accessible labels, text, and relationships when editing.";
  }
  return notes.map((note) => `- ${note}`).join("\n");
};

const getFrontmatter = ({
  title,
  description,
  component,
  base,
  packageName,
  exportName,
}: {
  title: string;
  description: string;
  component: boolean;
  base: string;
  packageName: string;
  exportName: string;
}) =>
  [
    "---",
    `title: ${JSON.stringify(title)}`,
    `description: ${JSON.stringify(description)}`,
    `component: ${component}`,
    `base: ${JSON.stringify(base)}`,
    `sourcePackage: ${JSON.stringify(packageName)}`,
    `sourceExport: ${JSON.stringify(exportName)}`,
    "---",
  ].join("\n");

const formatProps = (meta: WsComponentMeta) => {
  const props = Object.entries(meta.props ?? {});
  if (props.length === 0) {
    return "This component does not define public component props.";
  }
  return props
    .map(([name, prop]) => {
      const required = prop.required ? " required" : "";
      const details = [
        `type: \`${prop.type}\``,
        `control: \`${prop.control}\``,
        prop.defaultValue === undefined
          ? undefined
          : `default: \`${JSON.stringify(prop.defaultValue)}\``,
      ]
        .filter(isDefined)
        .join(", ");
      const description = prop.description ? ` ${prop.description}` : "";
      return `- \`${name}\`${required}: ${details}.${description}`;
    })
    .join("\n");
};

const formatStates = (meta: WsComponentMeta) => {
  const states = meta.states ?? [];
  if (states.length === 0) {
    return "This component does not define custom visual states.";
  }
  return states
    .map((state) => `- ${state.label}: \`${state.selector}\``)
    .join("\n");
};

const formatContentModel = (meta: WsComponentMeta) => {
  if (meta.contentModel === undefined) {
    return "No explicit content model is defined.";
  }
  return [
    `- Category: \`${meta.contentModel.category}\``,
    `- Direct children: ${meta.contentModel.children.map((child) => `\`${child}\``).join(", ")}`,
    meta.contentModel.descendants
      ? `- Required descendants: ${meta.contentModel.descendants.map((child) => `\`${child}\``).join(", ")}`
      : undefined,
  ]
    .filter(isDefined)
    .join("\n");
};

export const createComponentDocs = ({
  name,
  meta,
  composition,
  template,
  packageName,
}: {
  name: string;
  meta: WsComponentMeta;
  composition?: Composition;
  template?: TemplateMeta;
  packageName: string;
}) => {
  const title = getTitle(name, meta);
  const description = getDescription(title, meta);
  const radixFamily = isRadixPackage(packageName)
    ? getRadixFamily(name, composition)
    : undefined;
  const sections = [
    getFrontmatter({
      title,
      description,
      component: true,
      base: getDocsBase(packageName),
      packageName,
      exportName: name,
    }),
    `# ${title}`,
    description,
    `## Installation`,
    [
      `Use the Webstudio component registry item \`${kebabCase(name)}\`.`,
      "In Builder automation, resolve the item from the generated shadcn-compatible registry and use the Webstudio metadata in `meta` for insertion.",
      template
        ? `Prefer the \`${name}\` template when creating a new instance from scratch.`
        : undefined,
    ]
      .filter(isDefined)
      .join("\n\n"),
    `## Usage`,
    [
      "Use this component through Webstudio's instance, props, styles, resources, and data-source model.",
      "Inspect the registry metadata before creating or editing instances so content model, states, and composition stay valid.",
    ].join("\n\n"),
    `## Composition`,
    composition?.tree
      ? `Use the following composition to build \`${name}\`:\n\n\`\`\`text\n${composition.tree}\n\`\`\``
      : composition?.role === "part"
        ? `Use this component only as part of the \`${composition.family}\` family. Follow the parent component's composition tree and content model when inserting or moving it.`
        : "This component is used as a standalone component or follows its content model.",
    `## Examples`,
    template
      ? `Use the \`${name}\` template as the canonical starter. ${template.description ?? ""}`.trim()
      : "No canonical template is currently exported for this component.",
    `## API Reference`,
    `### Props`,
    formatProps(meta),
    `### Content Model`,
    formatContentModel(meta),
    `### States`,
    formatStates(meta),
    `## Accessibility`,
    formatAccessibility({ meta }),
    `## LLM Guidance`,
    [
      "- Prefer semantic Webstudio components and templates over raw HTML embeds.",
      "- Preserve existing instance structure, props, styles, resources, and data bindings when editing.",
      composition?.role === "part"
        ? `- This component is part of the \`${composition.family}\` family. Do not insert it without the required surrounding composition.`
        : undefined,
      composition?.tree
        ? "- Prefer inserting the complete template or composition tree instead of manually creating individual parts."
        : undefined,
    ]
      .filter(isDefined)
      .join("\n"),
    `## References`,
    formatReferences({ packageName, radixFamily }),
  ];
  return sections.filter(isDefined).join("\n\n");
};

export const createTemplateDocs = ({
  name,
  meta,
  packageName,
}: {
  name: string;
  meta: TemplateMeta;
  packageName: string;
}) => {
  const title = getTitle(name, meta);
  const description = getDescription(title, meta);
  return [
    getFrontmatter({
      title,
      description,
      component: false,
      base: getDocsBase(packageName),
      packageName,
      exportName: name,
    }),
    `# ${title}`,
    description,
    `## Installation`,
    `Use the Webstudio template registry item \`${kebabCase(name)}\` from the generated shadcn-compatible registry.`,
    `## Usage`,
    "Insert this template when the user asks for this component family or pattern. After insertion, customize text, links, props, and styles semantically.",
    `## Examples`,
    "Use this template as the canonical starter for its component family or layout pattern.",
    `## API Reference`,
    "This registry item installs a Webstudio template rather than a standalone component API.",
    `## LLM Guidance`,
    "- Prefer template insertion over manually assembling compound structures.\n- Preserve editable placeholders and replace them with user-specific content.",
    `## References`,
    formatReferences({ packageName }),
  ].join("\n\n");
};

export const buildRegistryArtifacts = ({
  packageJson,
  metas,
  templates,
}: {
  packageJson: {
    name: string;
    homepage?: string;
  };
  metas: Map<string, WsComponentMeta>;
  templates: Map<string, TemplateMeta>;
}): RegistryArtifacts => {
  const docs = new Map<string, string>();
  const items: ComponentRegistryItem[] = [];
  const compositions = inferCompositions(metas);
  for (const [name, meta] of metas) {
    const title = getTitle(name, meta);
    const description = getDescription(title, meta);
    const composition = compositions.get(name);
    const template = templates.get(name);
    const itemName = kebabCase(name);
    const docsPath = `docs/${itemName}.mdx`;
    docs.set(
      docsPath,
      `${createComponentDocs({
        name,
        meta,
        composition,
        template,
        packageName: packageJson.name,
      })}\n`
    );
    items.push({
      name: itemName,
      type: "registry:ui",
      title,
      description,
      source: {
        package: packageJson.name,
        export: name,
        kind: "component",
      },
      docs: docsPath,
      component: compactObject({
        name,
        category: meta.category,
        contentModel: meta.contentModel,
        indexWithinAncestor: meta.indexWithinAncestor,
        label: meta.label,
        description: meta.description,
        icon: meta.icon,
        presetStyle: meta.presetStyle,
        order: meta.order,
        initialProps: meta.initialProps,
        props: meta.props,
        states: meta.states,
        composition,
      }) as ComponentRegistryItem["component"],
      template: template
        ? {
            name,
            title: getTitle(name, template),
            description: template.description,
            category: template.category,
          }
        : undefined,
    });
  }

  for (const [name, meta] of templates) {
    if (metas.has(name)) {
      continue;
    }
    const title = getTitle(name, meta);
    const description = getDescription(title, meta);
    const itemName = kebabCase(name);
    const docsPath = `docs/${itemName}.mdx`;
    docs.set(
      docsPath,
      `${createTemplateDocs({ name, meta, packageName: packageJson.name })}\n`
    );
    items.push({
      name: itemName,
      type: "registry:block",
      title,
      description,
      source: {
        package: packageJson.name,
        export: name,
        kind: "template",
      },
      docs: docsPath,
      template: {
        name,
        category: meta.category,
        description: meta.description,
      },
    });
  }

  items.sort((left, right) => left.name.localeCompare(right.name));
  const registryName = packageJson.name.replace(/^@/, "").replaceAll("/", "-");
  const homepage = packageJson.homepage ?? "https://webstudio.is";
  const registry = webstudioRegistrySchema.parse({
    $schema: registrySchema,
    name: registryName,
    homepage,
    items: items.map((item) => ({
      $schema: registryItemSchema,
      name: item.name,
      type: item.type,
      title: item.title,
      description: item.description,
      meta: normalize({
        source: item.source,
        docs: item.docs,
        component: item.component?.name,
        category: item.component?.category,
        contentModel: item.component?.contentModel,
        indexWithinAncestor: item.component?.indexWithinAncestor,
        label: item.component?.label,
        description: item.component?.description,
        icon: item.component?.icon,
        presetStyle: item.component?.presetStyle,
        order: item.component?.order,
        initialProps: item.component?.initialProps,
        props: item.component?.props,
        states: item.component?.states,
        composition: item.component?.composition,
        template: item.template,
      }),
    })),
  });
  return {
    registry,
    docs,
  };
};

export const generateRegistry = async () => {
  const packageFile = await readFile(join(cwd(), "package.json"), "utf8");
  const packageJson = JSON.parse(packageFile) as {
    name: string;
    homepage?: string;
  };
  const metasModule = join(cwd(), "src/metas.ts");
  const metas = new Map<string, WsComponentMeta>(
    Object.entries(await import(metasModule))
  );
  let templates = new Map<string, TemplateMeta>();
  const templatesModule = join(cwd(), "src/templates.ts");
  if (await fileExists(templatesModule)) {
    templates = new Map<string, TemplateMeta>(
      Object.entries(await import(templatesModule))
    );
  }
  const { registry, docs } = buildRegistryArtifacts({
    packageJson,
    metas,
    templates,
  });

  const outputDir = join(dirname(metasModule), "__generated__");
  const docsDir = join(outputDir, "docs");
  await rm(docsDir, { recursive: true, force: true });
  await mkdir(docsDir, { recursive: true });
  for (const [docsPath, content] of docs) {
    await writeFile(join(outputDir, docsPath), content);
  }
  await writeFile(
    join(outputDir, "registry.json"),
    `${JSON.stringify(registry, null, 2)}\n`
  );
};
