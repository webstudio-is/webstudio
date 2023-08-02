import type { ExoticComponent } from "react";
import type { Instance } from "@webstudio-is/project-build";
import { getStyleDeclKey } from "@webstudio-is/project-build";
import type { WsComponentMeta } from "./components/component-meta";
import { generateDataFromEmbedTemplate } from "./embed-template";
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
}: {
  name: Instance["component"];
  metas: Record<string, WsComponentMeta>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  components: Record<string, ExoticComponent<any>>;
}) => {
  const metas = new Map(Object.entries(metasRecord));
  const data = generateDataFromEmbedTemplate(
    metas.get(name)?.template ?? [
      {
        type: "instance",
        component: name,
        children: [],
      },
    ],
    "base"
  );
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
        executeComputingExpressions={(values) => {
          const expressions = new Map<string, string>();
          for (const dataSource of data.dataSources) {
            const name = encodeDataSourceVariable(dataSource.id);
            if (dataSource.type === "expression") {
              expressions.set(name, dataSource.code);
            }
          }
          return decodeVariablesMap(
            executeComputingExpressions(expressions, encodeVariablesMap(values))
          );
        }}
        executeEffectfulExpression={(code, args, values) => {
          return decodeVariablesMap(
            executeEffectfulExpression(code, args, encodeVariablesMap(values))
          );
        }}
        Component={WebstudioComponent}
        components={new Map(Object.entries(components))}
        indexesWithinAncestors={getIndexesWithinAncestors(
          metas,
          new Map(instances),
          ["root"]
        )}
      />
    </>
  );
};
