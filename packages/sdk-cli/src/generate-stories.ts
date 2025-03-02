import { cwd } from "node:process";
import { dirname, join } from "node:path";
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
import {
  generateWebstudioComponent,
  namespaceMeta,
} from "@webstudio-is/react-sdk";
import { renderTemplate, type TemplateMeta } from "@webstudio-is/template";

const WS_NAMESPACE = "ws";
const BASE_NAMESPACE = "@webstudio-is/sdk-components-react";

const generateComponentImports = ({
  scope,
  metas,
  components,
}: {
  scope: Scope;
  metas: Map<string, WsComponentMeta>;
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
    if (metas.has(shortName)) {
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

export const generateStories = async () => {
  const packageFile = await readFile(join(cwd(), "package.json"), "utf8");
  const packageJson = JSON.parse(packageFile);
  const templatesModule = join(cwd(), "src/templates.ts");
  const templates = new Map<string, TemplateMeta>(
    Object.entries(await import(templatesModule))
  );
  const metasModule = join(cwd(), "src/metas.ts");
  const metas = new Map<string, WsComponentMeta>(
    Object.entries(await import(metasModule))
  );
  const storiesDir = join(dirname(templatesModule), "__generated__");
  await mkdir(storiesDir, { recursive: true });

  for (const [name, meta] of templates) {
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
    const namespaces: string[] = [];
    for (const instance of instances.values()) {
      const [namespace = BASE_NAMESPACE] = parseComponentName(
        instance.component
      );
      components.add(instance.component);
      namespaces.push(namespace);
    }
    const usedMetas = new Map<string, WsComponentMeta>();
    for (const namespace of namespaces) {
      let namespaceMetas;
      if (namespace === WS_NAMESPACE) {
        namespaceMetas = new Map(Object.entries(coreMetas));
      } else if (namespace === packageJson.name) {
        namespaceMetas = metas;
      } else {
        const metasUrl = import.meta.resolve(
          `${namespace}/metas`,
          templatesModule
        );
        namespaceMetas = new Map(Object.entries(await import(metasUrl)));
      }
      for (let [name, meta] of namespaceMetas) {
        if (namespace !== BASE_NAMESPACE && namespace !== WS_NAMESPACE) {
          name = `${namespace}:${name}`;
          meta = namespaceMeta(
            meta as WsComponentMeta,
            namespace,
            new Set(metas.keys())
          );
        }
        if (components.has(name)) {
          usedMetas.set(name, meta as WsComponentMeta);
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
      metas,
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
