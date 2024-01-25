import { dirname, join } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { kebabCase } from "change-case";
import {
  type Instances,
  type Instance,
  type Scope,
  createScope,
  parseComponentName,
  getStyleDeclKey,
} from "@webstudio-is/sdk";
import {
  type WsComponentMeta,
  generateCss,
  generateDataFromEmbedTemplate,
  generateWebstudioComponent,
  getIndexesWithinAncestors,
} from "@webstudio-is/react-sdk";
import * as baseMetasExports from "@webstudio-is/sdk-components-react/metas";

const baseMetas = new Map(Object.entries(baseMetasExports));

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
  const BASE_NAMESPACE = "@webstudio-is/sdk-components-react";

  for (const component of components) {
    const parsed = parseComponentName(component);
    let [namespace] = parsed;
    const [_namespace, shortName] = parsed;
    if (namespace === undefined) {
      // use base as fallback namespace and consider remix overrides
      if (metas.has(shortName)) {
        namespace = "../components";
      } else {
        namespace = BASE_NAMESPACE;
      }
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
    const specifiers = Array.from(componentsSet)
      .map(
        ([shortName, component]) =>
          `${component} as ${scope.getName(component, shortName)}`
      )
      .join(", ");
    componentImports += `import { ${specifiers} } from "${namespace}";\n`;
  }
  return componentImports;
};

const getStoriesImports = ({ hasState }: { hasState: boolean }) =>
  hasState ? `import { useState } from "react";\n` : "";

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
  const metasModule = join(process.cwd(), "src/metas.ts");
  const metas = new Map<string, WsComponentMeta>(
    Object.entries(await import(metasModule))
  );
  const storiesDir = join(dirname(metasModule), "__generated__");
  await mkdir(storiesDir, { recursive: true });

  for (const [name, meta] of metas) {
    if (meta.template === undefined) {
      continue;
    }
    const rootInstanceId = "root";
    const baseBreakpointId = "base";
    let id = 0;
    const generateStableId = () => (++id).toString();
    const data = generateDataFromEmbedTemplate(
      meta.template,
      metas,
      baseBreakpointId,
      generateStableId
    );
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
      ...data.instances.map(
        (instance) =>
          [instance.id, instance] satisfies [Instance["id"], Instance]
      ),
    ]);
    const components = new Set<Instance["component"]>();
    const usedMetas = new Map<Instance["component"], WsComponentMeta>();
    const bodyMeta = baseMetas.get("Body");
    // add body styles for stories
    if (bodyMeta) {
      usedMetas.set("Body", bodyMeta);
    }
    for (const instance of instances.values()) {
      components.add(instance.component);
      const meta =
        metas.get(instance.component) ?? baseMetas.get(instance.component);
      if (meta) {
        usedMetas.set(instance.component, meta);
      }
    }
    const { cssText, classesMap } = generateCss(
      {
        assets: [],
        breakpoints: [
          [baseBreakpointId, { id: baseBreakpointId, label: "base" }],
        ],
        styles: data.styles.map((item) => [getStyleDeclKey(item), item]),
        styleSourceSelections: data.styleSourceSelections.map((item) => [
          item.instanceId,
          item,
        ]),
        componentMetas: usedMetas,
      },
      { assetBaseUrl: "/", atomic: true }
    );
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
      classesMap,
      scope,
      name: `Component`,
      rootInstanceId,
      parameters: [],
      instances,
      props: new Map(data.props.map((prop) => [prop.id, prop])),
      dataSources: new Map(data.dataSources.map((prop) => [prop.id, prop])),
      indexesWithinAncestors: getIndexesWithinAncestors(usedMetas, instances, [
        rootInstanceId,
      ]),
    });

    content += getStoriesExports(name, cssText);
    await writeFile(
      join(storiesDir, kebabCase(name) + ".stories.tsx"),
      content
    );
  }
};
