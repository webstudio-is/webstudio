import { useRef, type ComponentProps } from "react";
import { atom, type WritableAtom } from "nanostores";
import type { Build, DataSource, Page } from "@webstudio-is/project-build";
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
  const dataSourceValuesStoreRef = useRef<
    undefined | WritableAtom<Map<DataSource["id"], unknown>>
  >(undefined);
  // initialize store with default data source values
  if (dataSourceValuesStoreRef.current === undefined) {
    dataSourceValuesStoreRef.current = atom(
      new Map(
        data.build.dataSources.map(([dataSourceId, dataSource]) => [
          dataSourceId,
          dataSource.value,
        ])
      )
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
      const dataSourceValues = new Map(dataSourceValuesStore.get());
      dataSourceValues.set(dataSourceId, value);
      dataSourceValuesStore.set(dataSourceValues);
    },
    Component: Component ?? WebstudioComponent,
    components,
  });
};
