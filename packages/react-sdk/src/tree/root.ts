import { useRef, type ComponentProps } from "react";
import {
  atom,
  computed,
  type ReadableAtom,
  type WritableAtom,
} from "nanostores";
import { type Build, type Page, DataSource } from "@webstudio-is/project-build";
import type { Asset } from "@webstudio-is/asset-uploader";
import { createElementsTree } from "./create-elements-tree";
import { WebstudioComponent } from "./webstudio-component";
import { getPropsByInstanceId } from "../props";
import type { Components } from "../components/components-utils";
import type { Params } from "../context";
import {
  executeExpressions,
  encodeDataSourceVariable,
  decodeDataSourceVariable,
} from "../expression";

const computeExpressions = (
  dataSources: [DataSource["id"], DataSource][],
  dataSourceValues: Map<DataSource["id"], unknown>
) => {
  const outputValues = new Map<DataSource["id"], unknown>();
  const variables = new Map<string, unknown>();
  const expressions = new Map<string, string>();
  for (const [dataSourceId, dataSource] of dataSources) {
    const name = encodeDataSourceVariable(dataSourceId);
    if (dataSource.type === "variable") {
      const value =
        dataSourceValues.get(dataSourceId) ?? dataSource.value.value;
      variables.set(name, value);
      outputValues.set(dataSourceId, value);
    }
    if (dataSource.type === "expression") {
      expressions.set(name, dataSource.code);
    }
  }
  try {
    const outputVariables = executeExpressions(variables, expressions);
    for (const [name, value] of outputVariables) {
      const id = decodeDataSourceVariable(name);
      if (id !== undefined) {
        outputValues.set(id, value);
      }
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
  }
  return outputValues;
};

export type Data = {
  page: Page;
  pages: Array<Page>;
  build: Build;
  assets: Array<Asset>;
  params?: Params;
};

export type RootPropsData = Omit<Data, "build"> & {
  build: Pick<Data["build"], "instances" | "props" | "dataSources">;
};

type RootProps = {
  data: RootPropsData;
  Component?: (props: ComponentProps<typeof WebstudioComponent>) => JSX.Element;
  components: Components;
};

export const InstanceRoot = ({
  data,
  Component,
  components,
}: RootProps): JSX.Element | null => {
  const dataSourceVariablesStoreRef = useRef<
    undefined | WritableAtom<Map<DataSource["id"], unknown>>
  >(undefined);
  // initialize store with default data source values
  if (dataSourceVariablesStoreRef.current === undefined) {
    const dataSourceVariables = new Map<DataSource["id"], unknown>();
    for (const [dataSourceId, dataSource] of data.build.dataSources) {
      dataSourceVariables.set(dataSourceId, dataSource);
    }
    dataSourceVariablesStoreRef.current = atom(dataSourceVariables);
  }
  const dataSourceVariablesStore = dataSourceVariablesStoreRef.current;

  const dataSourceValuesStoreRef = useRef<
    undefined | ReadableAtom<Map<DataSource["id"], unknown>>
  >(undefined);
  // initialize store with default data source values
  if (dataSourceValuesStoreRef.current === undefined) {
    dataSourceValuesStoreRef.current = computed(
      dataSourceVariablesStore,
      (dataSourceVariables) => {
        return computeExpressions(data.build.dataSources, dataSourceVariables);
      }
    );
  }
  const dataSourceValuesStore = dataSourceValuesStoreRef.current;

  return createElementsTree({
    imageBaseUrl: data.params?.imageBaseUrl ?? "/",
    assetBaseUrl: data.params?.assetBaseUrl ?? "/",
    instances: new Map(data.build.instances),
    rootInstanceId: data.page.rootInstanceId,
    propsByInstanceIdStore: atom(
      getPropsByInstanceId(new Map(data.build.props))
    ),
    assetsStore: atom(new Map(data.assets.map((asset) => [asset.id, asset]))),
    pagesStore: atom(new Map(data.pages.map((page) => [page.id, page]))),
    dataSourceValuesStore,
    onDataSourceUpdate: (dataSourceId, value) => {
      const dataSourceVariables = new Map(dataSourceVariablesStore.get());
      dataSourceVariables.set(dataSourceId, value);
      dataSourceVariablesStore.set(dataSourceVariables);
    },
    Component: Component ?? WebstudioComponent,
    components,
  });
};
