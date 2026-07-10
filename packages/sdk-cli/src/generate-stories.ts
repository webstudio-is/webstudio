import { cwd } from "node:process";
import { join } from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { kebabCase } from "change-case";
import {
  type Instances,
  type Instance,
  type Scope,
  type WsComponentMeta,
  createScope,
  parseComponentName,
  getStyleDeclKey,
  coreMetas,
  generateCss,
} from "@webstudio-is/sdk";
import { generateWebstudioComponent } from "@webstudio-is/react-sdk";
import { renderTemplate, type TemplateMeta } from "@webstudio-is/template";

const WS_NAMESPACE = "ws";
const BASE_NAMESPACE = "@webstudio-is/sdk-components-react/components";

const generateComponentImports = ({
  scope,
  packageName,
  components,
}: {
  scope: Scope;
  packageName: string;
  components: Set<string>;
}) => {
  const namespaces = new Map<
    string,
    Set<[shortName: string, componentName: string]>
  >();

  for (const component of components) {
    const parsed = parseComponentName(component);
    let [namespace = BASE_NAMESPACE] = parsed;
    const [_namespace, shortName] = parsed;
    if (
      namespace === packageName ||
      (namespace === BASE_NAMESPACE &&
        packageName === "@webstudio-is/sdk-components-react")
    ) {
      namespace = "../components";
    }
    if (namespaces.has(namespace) === false) {
      namespaces.set(
        namespace,
        new Set<[shortName: string, componentName: string]>()
      );
    }
    namespaces.get(namespace)?.add([shortName, component]);
  }

  let componentImports = "";
  for (const [namespace, componentsSet] of namespaces.entries()) {
    if (namespace === WS_NAMESPACE) {
      continue;
    }
    const specifiers = Array.from(componentsSet)
      .map(
        ([shortName, component]) =>
          `${shortName} as ${scope.getName(component, shortName)}`
      )
      .join(", ");
    componentImports += `import { ${specifiers} } from "${namespace}";\n`;
  }
  return componentImports;
};

const getStoriesImports = ({ hasState }: { hasState: boolean }) =>
  hasState
    ? `import { useVariableState } from "@webstudio-is/react-sdk/runtime";\n`
    : "";

const getStoriesExports = (name: string, css: string) => `
export default {
  title: "Components/${name}"
};

const Story = {
  render() {
    return <>
      <style>
      {\`
${css}
      \`}
      </style>
      <Component />
    </>
  }
}

export { Story as ${name} }
`;

export const generateStories = async ({
  packageName,
  templates,
  metas,
  namespaceMetas = new Map(),
  outputDir = "src/__generated__",
}: {
  packageName: string;
  templates: Record<string, TemplateMeta>;
  metas: Record<string, WsComponentMeta>;
  namespaceMetas?: Map<string, Record<string, WsComponentMeta>>;
  outputDir?: string;
}) => {
  const packageFile = await readFile(join(cwd(), "package.json"), "utf8");
  const packageJson = JSON.parse(packageFile);
  if (packageJson.name !== packageName) {
    throw Error(
      `Cannot generate stories for ${packageName} from package ${packageJson.name}`
    );
  }
  const templatesMap = new Map<string, TemplateMeta>(Object.entries(templates));
  const metasMap = new Map<string, WsComponentMeta>(Object.entries(metas));
  const storiesDir = join(cwd(), outputDir);
  await mkdir(storiesDir, { recursive: true });

  for (const [name, meta] of templatesMap) {
    const rootInstanceId = "root";
    const data = renderTemplate(meta.template);
    const instances: Instances = new Map([
      [
        rootInstanceId,
        {
          type: "instance",
          id: rootInstanceId,
          component: "Box",
          children: data.children,
        },
      ],
      ...data.instances.map((instance) => [instance.id, instance] as const),
    ]);
    const props = new Map(data.props.map((prop) => [prop.id, prop]));
    const breakpoints = new Map(
      data.breakpoints.map((breakpoint) => [breakpoint.id, breakpoint])
    );
    const components = new Set<Instance["component"]>();
    const namespaces = new Set<string>();
    for (const instance of instances.values()) {
      const [namespace = BASE_NAMESPACE] = parseComponentName(
        instance.component
      );
      components.add(instance.component);
      namespaces.add(namespace);
    }
    const usedMetas = new Map<string, WsComponentMeta>();
    for (const namespace of namespaces) {
      let namespaceMetasForComponents: Map<string, WsComponentMeta>;
      if (
        namespace === BASE_NAMESPACE &&
        packageJson.name === "@webstudio-is/sdk-components-react"
      ) {
        namespaceMetasForComponents = metasMap;
      } else if (namespace === WS_NAMESPACE) {
        namespaceMetasForComponents = new Map(Object.entries(coreMetas));
      } else if (namespace === packageJson.name) {
        namespaceMetasForComponents = metasMap;
      } else {
        const metas = namespaceMetas.get(namespace);
        if (metas === undefined) {
          throw Error(`Missing metas for namespace "${namespace}"`);
        }
        namespaceMetasForComponents = new Map(Object.entries(metas));
      }
      for (const [name, meta] of namespaceMetasForComponents) {
        let prefixedName = name;
        if (namespace !== BASE_NAMESPACE && namespace !== WS_NAMESPACE) {
          prefixedName = `${namespace}:${name}`;
        }
        if (components.has(prefixedName)) {
          usedMetas.set(prefixedName, meta as WsComponentMeta);
        }
      }
    }

    const { cssText, classes } = generateCss({
      instances,
      props,
      assets: new Map(),
      breakpoints,
      styles: new Map(data.styles.map((item) => [getStyleDeclKey(item), item])),
      styleSourceSelections: new Map(
        data.styleSourceSelections.map((item) => [item.instanceId, item])
      ),
      componentMetas: usedMetas,
      assetBaseUrl: "/",
      atomic: false,
    });
    const scope = createScope(["Component", "Story", "props", "useState"]);
    let content = "";
    content += getStoriesImports({
      hasState: data.dataSources.some(
        (dataSource) => dataSource.type === "variable"
      ),
    });
    content += generateComponentImports({
      scope,
      packageName: packageJson.name,
      components,
    });
    content += `\n`;
    content += generateWebstudioComponent({
      classesMap: classes,
      scope,
      name: `Component`,
      rootInstanceId,
      parameters: [],
      instances,
      props,
      dataSources: new Map(data.dataSources.map((prop) => [prop.id, prop])),
      metas: usedMetas,
    });

    content += getStoriesExports(name, cssText);
    await writeFile(
      join(storiesDir, kebabCase(name) + ".stories.tsx"),
      content
    );
  }
};
