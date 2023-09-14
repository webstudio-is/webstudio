import {
  useRef,
  type ForwardRefExoticComponent,
  type RefAttributes,
  type ReactNode,
} from "react";
import {
  atom,
  computed,
  type ReadableAtom,
  type WritableAtom,
} from "nanostores";
import type {
  Page,
  Asset,
  DataSource,
  Instance,
  Prop,
} from "@webstudio-is/sdk";
import { createElementsTree } from "./create-elements-tree";
import {
  WebstudioComponent,
  type WebstudioComponentProps,
} from "./webstudio-component";
import { getPropsByInstanceId } from "../props";
import type { Components } from "../components/components-utils";
import type { Params } from "../context";
import type { GeneratedUtils } from "../generator";
import type { ImageLoader } from "@webstudio-is/image";

type DataSourceValues = Map<DataSource["id"], unknown>;

export type RootPropsData = {
  params?: Params;
  page: Page;
  pages: Array<Page>;
  assets: Array<Asset>;
  build: {
    instances: [Instance["id"], Instance][];
    dataSources: [DataSource["id"], DataSource][];
    props: [Prop["id"], Prop][];
  };
};

type RootProps = {
  data: RootPropsData;
  utils: GeneratedUtils;
  Component?: ForwardRefExoticComponent<
    WebstudioComponentProps & RefAttributes<HTMLElement>
  >;
  components: Components;
  scripts?: ReactNode;
  imageLoader: ImageLoader;
};

export const InstanceRoot = ({
  data,
  utils,
  Component,
  components,
  scripts,
  imageLoader,
}: RootProps): JSX.Element | null => {
  const { indexesWithinAncestors, getDataSourcesLogic } = utils;
  const dataSourceVariablesStoreRef = useRef<
    undefined | WritableAtom<DataSourceValues>
  >(undefined);
  if (dataSourceVariablesStoreRef.current === undefined) {
    dataSourceVariablesStoreRef.current = atom(new Map());
  }
  const dataSourceVariablesStore = dataSourceVariablesStoreRef.current;

  const dataSourcesLogicStoreRef = useRef<
    undefined | ReadableAtom<DataSourceValues>
  >(undefined);
  if (dataSourcesLogicStoreRef.current === undefined) {
    dataSourcesLogicStoreRef.current = computed(
      dataSourceVariablesStore,
      (dataSourceVariables) => {
        try {
          const getVariable = (id: string) => {
            return dataSourceVariables.get(id);
          };
          const setVariable = (id: string, value: unknown) => {
            const dataSourceVariables = new Map(dataSourceVariablesStore.get());
            dataSourceVariables.set(id, value);
            dataSourceVariablesStore.set(dataSourceVariables);
          };
          return getDataSourcesLogic(getVariable, setVariable);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(error);
        }

        return new Map();
      }
    );
  }
  const dataSourcesLogicStore = dataSourcesLogicStoreRef.current;

  return createElementsTree({
    imageLoader,
    imageBaseUrl: data.params?.imageBaseUrl ?? "/",
    assetBaseUrl: data.params?.assetBaseUrl ?? "/",
    instances: new Map(data.build.instances),
    rootInstanceId: data.page.rootInstanceId,
    propsByInstanceIdStore: atom(
      getPropsByInstanceId(new Map(data.build.props))
    ),
    assetsStore: atom(new Map(data.assets.map((asset) => [asset.id, asset]))),
    pagesStore: atom(new Map(data.pages.map((page) => [page.id, page]))),
    indexesWithinAncestors,
    dataSourcesLogicStore,
    Component: Component ?? WebstudioComponent,
    components,
    scripts,
  });
};
