import type { ExoticComponent } from "react";
import type { Instance } from "@webstudio-is/sdk";
import { createScope, getStyleDeclKey } from "@webstudio-is/sdk";
import type { WsComponentMeta } from "./components/component-meta";
import {
  WsEmbedTemplate,
  generateDataFromEmbedTemplate,
} from "./embed-template";
import { generateCssText } from "./css";
import { InstanceRoot, WebstudioComponent } from "./tree";
import { generateDataSources } from "./expression";
import { getIndexesWithinAncestors } from "./instance-utils";
import type { ImageLoader } from "@webstudio-is/image";

export const renderComponentTemplate = ({
  name,
  metas: metasRecord,
  components,
  props,
  imageLoader,
}: {
  name: Instance["component"];
  metas: Record<string, WsComponentMeta>;
  props?: Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  components: Record<string, ExoticComponent<any>>;
  imageLoader?: ImageLoader;
}) => {
  const metas = new Map(Object.entries(metasRecord));

  const template: WsEmbedTemplate = metas.get(name)?.template ?? [
    {
      type: "instance",
      component: name,
      children: [],
    },
  ];

  if (template[0].type === "instance" && props !== undefined) {
    template[0].props = Object.entries(props).map(([prop, value]) => {
      if (typeof value === "string") {
        return { type: "string", name: prop, value: value };
      }

      if (typeof value === "number") {
        return { type: "number", name: prop, value: value };
      }

      if (typeof value === "boolean") {
        return { type: "boolean", name: prop, value: value };
      }
      throw new Error(`Unsupported prop ${props} with value ${value}`);
    });
  }

  const data = generateDataFromEmbedTemplate(template, metas, "base");

  const instances: [Instance["id"], Instance][] = [
    [
      "root",
      {
        type: "instance",
        id: "root",
        component: "Box",
        children: data.children,
      },
    ],
    ...data.instances.map(
      (instance) => [instance.id, instance] satisfies [Instance["id"], Instance]
    ),
  ];

  return (
    <>
      <style>
        {generateCssText(
          {
            assets: [],
            breakpoints: [["base", { id: "base", label: "base" }]],
            styles: data.styles.map((item) => [getStyleDeclKey(item), item]),
            styleSourceSelections: data.styleSourceSelections.map((item) => [
              item.instanceId,
              item,
            ]),
            componentMetas: metas,
          },
          { assetBaseUrl: "/" }
        )}
      </style>
      <InstanceRoot
        data={{
          page: {
            path: "",
            id: "",
            name: "",
            title: "",
            meta: {},
            rootInstanceId: "root",
          },
          pages: [],
          assets: [],
          build: {
            instances,
            props: data.props.map((prop) => [prop.id, prop]),
            dataSources: data.dataSources.map((dataSource) => [
              dataSource.id,
              dataSource,
            ]),
          },
        }}
        utils={{
          indexesWithinAncestors: getIndexesWithinAncestors(
            metas,
            new Map(instances),
            ["root"]
          ),
          getDataSourcesLogic(getVariable, setVariable) {
            const { variables, body, output } = generateDataSources({
              scope: createScope(["_getVariable", "_setVariable", "_output"]),
              props: new Map(data.props.map((prop) => [prop.id, prop])),
              dataSources: new Map(
                data.dataSources.map((dataSource) => [
                  dataSource.id,
                  dataSource,
                ])
              ),
            });
            let generatedCode = "";
            for (const [dataSourceId, variable] of variables) {
              const { valueName, setterName } = variable;
              const initialValue = JSON.stringify(variable.initialValue);
              generatedCode += `let ${valueName} = _getVariable("${dataSourceId}") ?? ${initialValue};\n`;
              generatedCode += `let ${setterName} = (value) => _setVariable("${dataSourceId}", value);\n`;
            }
            generatedCode += body;
            generatedCode += `let _output = new Map();\n`;
            for (const [dataSourceId, variableName] of output) {
              generatedCode += `_output.set('${dataSourceId}', ${variableName})\n`;
            }
            generatedCode += `return _output\n`;

            try {
              const executeFn = new Function(
                "_getVariable",
                "_setVariable",
                generatedCode
              );
              return executeFn(getVariable, setVariable);
            } catch (error) {
              // eslint-disable-next-line no-console
              console.error(error);
            }
            return new Map();
          },
        }}
        Component={WebstudioComponent}
        components={new Map(Object.entries(components))}
        imageLoader={imageLoader ?? (({ src }) => src)}
      />
    </>
  );
};
