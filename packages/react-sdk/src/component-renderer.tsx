import type { ExoticComponent } from "react";
import type { Instance } from "@webstudio-is/sdk";
import { getStyleDeclKey } from "@webstudio-is/sdk";
import type { WsComponentMeta } from "./components/component-meta";
import {
  WsEmbedTemplate,
  generateDataFromEmbedTemplate,
} from "./embed-template";
import { generateCssText } from "./css";
import { InstanceRoot, WebstudioComponent } from "./tree";
import {
  decodeVariablesMap,
  encodeDataSourceVariable,
  encodeVariablesMap,
  executeComputingExpressions,
  executeEffectfulExpression,
} from "./expression";
import { getIndexesWithinAncestors } from "./instance-utils";

export const renderComponentTemplate = ({
  name,
  metas: metasRecord,
  components,
  props,
}: {
  name: Instance["component"];
  metas: Record<string, WsComponentMeta>;
  props?: Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  components: Record<string, ExoticComponent<any>>;
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
          executeComputingExpressions: (values) => {
            const expressions = new Map<string, string>();
            for (const dataSource of data.dataSources) {
              const name = encodeDataSourceVariable(dataSource.id);
              if (dataSource.type === "expression") {
                expressions.set(name, dataSource.code);
              }
            }
            return decodeVariablesMap(
              executeComputingExpressions(
                expressions,
                encodeVariablesMap(values)
              )
            );
          },
          executeEffectfulExpression: (code, args, values) => {
            return decodeVariablesMap(
              executeEffectfulExpression(code, args, encodeVariablesMap(values))
            );
          },
        }}
        Component={WebstudioComponent}
        components={new Map(Object.entries(components))}
      />
    </>
  );
};
