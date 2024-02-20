import { ExtensionIcon } from "@webstudio-is/icons";
import { Flex } from "@webstudio-is/design-system";
import type { TabContentProps } from "../../types";
import { Header, CloseButton } from "../../header";
import { Marketplace } from "./marketplace";
import { ProductDialog } from "./product-dialog";
import { ProductPanel } from "./product-panel";
import { useActiveItem } from "./utils";
import { useEffect } from "react";
import { loadProjectDataById } from "@webstudio-is/http-client";
import {
  extractWebstudioFragment,
  insertWebstudioFragmentCopy,
  updateWebstudioData,
} from "~/shared/instance-utils";
import { $selectedInstanceSelector } from "~/shared/nano-states";

export const TabContent = ({ onSetActiveTab }: TabContentProps) => {
  const [activeItem, setActiveItem] = useActiveItem();
  const component = activeItem?.ui?.component ?? "panel";

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen === false) {
      setActiveItem(undefined);
    }
  };

  useEffect(() => {
    if (typeof window !== "object") {
      return;
    }
    window.addEventListener(
      "message",
      async (event: MessageEvent) => {
        const instanceSelector = $selectedInstanceSelector.get();
        if (instanceSelector === undefined || instanceSelector.length === 1) {
          return;
        }
        const action = event.data ?? {};
        console.log(action, activeItem);
        if (
          action.namespace === "MarketplaceStore" &&
          action.type === "insert" &&
          activeItem !== undefined
        ) {
          const data = await loadProjectDataById({
            projectId: activeItem.projectId,
            authToken: activeItem.authToken,
            origin: location.origin,
          });
          const fragment = extractWebstudioFragment(
            {
              pages: data.build.pages,
              assets: new Map(data.assets.map((asset) => [asset.id, asset])),
              instances: new Map(data.build.instances),
              dataSources: new Map(data.build.dataSources),
              resources: new Map(data.build.resources),
              props: new Map(data.build.props),
              styleSourceSelections: new Map(data.build.styleSourceSelections),
              styleSources: new Map(data.build.styleSources),
              breakpoints: new Map(data.build.breakpoints),
              styles: new Map(data.build.styles),
            },
            action.payload
          );

          // body is not allowed to copy
          // so clipboard always have at least two level instance selector
          //const [targetInstanceId, parentInstanceId] = instanceSelector;
          //const parentInstanceSelector = instanceSelector.slice(1);

          updateWebstudioData((data) => {
            insertWebstudioFragmentCopy({
              fragment,
              data,
              availableDataSources: new Set(),
            });
          });
          console.log(fragment);
        }
      },
      false
    );
  }, [activeItem]);

  return (
    <Flex direction="column" css={{ height: "100%" }}>
      <Header
        title="Marketplace"
        suffix={<CloseButton onClick={() => onSetActiveTab("none")} />}
      />
      {component === "dialog" && activeItem && (
        <ProductDialog item={activeItem} onOpenChange={handleOpenChange} />
      )}
      {component === "panel" && activeItem ? (
        <ProductPanel item={activeItem} onOpenChange={handleOpenChange} />
      ) : (
        <Marketplace />
      )}
    </Flex>
  );
};

export const icon = <ExtensionIcon />;
