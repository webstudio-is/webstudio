import { SpinnerIcon } from "@webstudio-is/icons";
import {
  Flex,
  PanelTitle,
  rawTheme,
  Separator,
} from "@webstudio-is/design-system";
import { Overview } from "./overview";
import { Templates } from "./templates";
import { useEffect, useState } from "react";
import { toWebstudioData } from "./utils";
import type { MarketplaceOverviewItem } from "~/shared/marketplace/types";
import type { Project } from "@webstudio-is/project";
import { ExtendedPanel } from "~/builder/shared/extended-sidebar-panel";
import { About } from "./about";
import { trpcClient } from "~/shared/trpc/trpc-client";

export const MarketplacePanel = (_props: { onClose: () => void }) => {
  const [activeOverviewItem, setAciveOverviewItem] =
    useState<MarketplaceOverviewItem>();
  const [openAbout, setOpenAbout] = useState<Project["id"]>();

  const {
    load: getItems,
    data: items,
    state: itemsLoadingState,
  } = trpcClient.marketplace.getItems.useQuery();

  const { load: getBuildData, data: buildData } =
    trpcClient.marketplace.getBuildData.useQuery();

  useEffect(() => {
    getItems();
  }, [getItems]);

  const openAboutItem = items?.find((item) => item.projectId === openAbout);
  const showTemplates =
    activeOverviewItem && buildData?.projectId === activeOverviewItem.projectId;

  return (
    <>
      <PanelTitle>Marketplace</PanelTitle>
      <Separator />
      <Overview
        items={items}
        activeProjectId={activeOverviewItem?.projectId}
        onSelect={(activeOverviewItem) => {
          setAciveOverviewItem(activeOverviewItem);
          getBuildData({ projectId: activeOverviewItem.projectId });
        }}
        openAbout={openAbout}
        onOpenAbout={setOpenAbout}
        hidden={showTemplates}
      />

      {showTemplates && (
        <Templates
          projectId={activeOverviewItem.projectId}
          name={activeOverviewItem.name}
          authorizationToken={activeOverviewItem.authorizationToken}
          productCategory={activeOverviewItem.category}
          data={toWebstudioData(buildData)}
          onOpenChange={(isOpen: boolean) => {
            if (isOpen === false) {
              setAciveOverviewItem(undefined);
            }
          }}
        />
      )}
      {itemsLoadingState !== "idle" && (
        <Flex justify="center" css={{ mt: "20%" }}>
          <SpinnerIcon size={rawTheme.spacing[15]} />
        </Flex>
      )}
      {openAboutItem !== undefined && (
        <ExtendedPanel>
          <About
            item={openAboutItem}
            onClose={() => {
              setOpenAbout(undefined);
            }}
          />
        </ExtendedPanel>
      )}
    </>
  );
};
