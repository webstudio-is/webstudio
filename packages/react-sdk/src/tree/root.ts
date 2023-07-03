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

type DataSourceValues = Map<DataSource["id"], unknown>;

type RootProps = {
  data: RootPropsData;
  computeExpressions: (values: DataSourceValues) => DataSourceValues;
  Component?: (props: ComponentProps<typeof WebstudioComponent>) => JSX.Element;
  components: Components;
};

export const InstanceRoot = ({
  data,
  computeExpressions,
  Component,
  components,
}: RootProps): JSX.Element | null => {
  const dataSourceVariablesStoreRef = useRef<
    undefined | WritableAtom<DataSourceValues>
  >(undefined);
  if (dataSourceVariablesStoreRef.current === undefined) {
    dataSourceVariablesStoreRef.current = atom(new Map());
  }
  const dataSourceVariablesStore = dataSourceVariablesStoreRef.current;

  const dataSourceValuesStoreRef = useRef<
    undefined | ReadableAtom<DataSourceValues>
  >(undefined);
  if (dataSourceValuesStoreRef.current === undefined) {
    dataSourceValuesStoreRef.current = computed(
      dataSourceVariablesStore,
      (dataSourceVariables) => {
        // set vriables with defaults
        const dataSourceValues: DataSourceValues = new Map();
        for (const [dataSourceId, dataSource] of data.build.dataSources) {
          if (dataSource.type === "variable") {
            const value =
              dataSourceVariables.get(dataSourceId) ?? dataSource.value.value;
            dataSourceValues.set(dataSourceId, value);
          }
        }

        // set expression values
        try {
          const result = computeExpressions(dataSourceValues);
          for (const [id, value] of result) {
            dataSourceValues.set(id, value);
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(error);
        }

        return dataSourceValues;
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
