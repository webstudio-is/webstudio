import type { ExoticComponent } from "react";
import type { Instance } from "@webstudio-is/project-build";
import { getStyleDeclKey } from "@webstudio-is/project-build";
import {
  type WsComponentMeta,
  InstanceRoot,
  WebstudioComponent,
  generateDataFromEmbedTemplate,
  generateCssText,
} from "@webstudio-is/react-sdk";

export const renderComponent = ({
  component,
  metas,
  components,
}: {
  component: Instance["component"];
  metas: Record<string, WsComponentMeta>;
  components: Record<string, ExoticComponent<any>>;
}) => {
  const data = generateDataFromEmbedTemplate(
    metas[component].template ?? [
      {
        type: "instance",
        component,
        children: [],
      },
    ],
    "base"
  );
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
            componentMetas: new Map(Object.entries(metas)),
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
            instances: [
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
                (instance) =>
                  [instance.id, instance] satisfies [Instance["id"], Instance]
              ),
            ],
            props: data.props.map((prop) => [prop.id, prop]),
            dataSources: data.dataSources.map((dataSource) => [
              dataSource.id,
              dataSource,
            ]),
          },
        }}
        executeComputingExpressions={() => new Map()}
        executeEffectfulExpression={() => new Map()}
        Component={WebstudioComponent}
        components={new Map(Object.entries(components))}
      />
    </>
  );
};
