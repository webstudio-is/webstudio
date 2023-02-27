import type { ComponentProps } from "react";
import { atom } from "nanostores";
import type {
  Build,
  Instance,
  Instances,
  InstancesItem,
  Tree,
} from "@webstudio-is/project-build";
import type { Asset } from "@webstudio-is/asset-uploader";
import { createElementsTree } from "./create-elements-tree";
import { WebstudioComponent } from "./webstudio-component";
import { registerComponents } from "../components";
import { customComponents as defaultCustomComponents } from "../app/custom-components";
import { setParams, type Params } from "../app/params";
import { getPropsByInstanceId } from "../props";
import type { GetComponent } from "../components/components-utils";

export type Data = {
  tree: Tree | null;
  build: Build | null;
  assets: Array<Asset>;
  params?: Params;
};

type RootProps = {
  data: Data;
  Component?: (props: ComponentProps<typeof WebstudioComponent>) => JSX.Element;
  customComponents?: Parameters<typeof registerComponents>[0];
  getComponent: GetComponent;
};

const denormalizeTree = (instances: Instances) => {
  const convertTree = (instance: InstancesItem) => {
    const legacyInstance: Instance = {
      type: "instance",
      id: instance.id,
      component: instance.component,
      children: [],
    };
    for (const child of instance.children) {
      if (child.type === "id") {
        const childInstance = instances.get(child.value);
        if (childInstance) {
          legacyInstance.children.push(convertTree(childInstance));
        }
      } else {
        legacyInstance.children.push(child);
      }
    }
    return legacyInstance;
  };
  return convertTree(Array.from(instances.values())[0]);
};

export const InstanceRoot = ({
  data,
  Component,
  customComponents = defaultCustomComponents,
  getComponent,
}: RootProps): JSX.Element | null => {
  if (data.tree === null || data.build === null) {
    throw new Error("Tree and build are required");
  }

  setParams(data.params ?? null);

  registerComponents(customComponents);

  return createElementsTree({
    instance: denormalizeTree(new Map(data.tree.instances)),
    propsByInstanceIdStore: atom(
      getPropsByInstanceId(new Map(data.build.props))
    ),
    assetsStore: atom(new Map(data.assets.map((asset) => [asset.id, asset]))),
    Component: Component ?? WebstudioComponent,
    getComponent,
  });
};
