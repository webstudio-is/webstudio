import { ExtensionIcon, SpinnerIcon } from "@webstudio-is/icons";
import { Flex, rawTheme } from "@webstudio-is/design-system";
import type { TabContentProps } from "../../types";
import { Header, CloseButton } from "../../header";
import { Overview } from "./overview";
import { Templates } from "./templates";
import { marketplacePath } from "~/shared/router-utils";
import { useEffect, useState } from "react";
import { toWebstudioData } from "./utils";
import type { MarketplaceOverviewItem } from "~/shared/marketplace/types";
import type { MarketplaceRouter } from "~/shared/marketplace/router";
import { createTrpcFetchProxy } from "~/shared/remix/trpc-remix-proxy";
import type { Project } from "@webstudio-is/project";
import { SettingsPanel } from "../pages/settings-panel";
import { ItemDetails } from "./item-details";

const trpc = createTrpcFetchProxy<MarketplaceRouter>(marketplacePath);

export const TabContent = ({ onSetActiveTab }: TabContentProps) => {
  const [activeOverviewItem, setAciveOverviewItem] =
    useState<MarketplaceOverviewItem>();
  const [openDetailsProjectId, setOpenDetailsProjectId] =
    useState<Project["id"]>();

  const {
    load: getItems,
    data: items,
    state: itemsLoadingState,
  } = trpc.getItems.useQuery();

  const { load: getBuildData, data: buildData } = trpc.getBuildData.useQuery();

  useEffect(() => {
    getItems();
  }, [getItems]);

  const openDetailsItem = items?.find(
    (item) => item.projectId === openDetailsProjectId
  );

  return (
    <Flex direction="column" css={{ height: "100%" }}>
      <Header
        title="Marketplace"
        suffix={<CloseButton onClick={() => onSetActiveTab("none")} />}
      />
      {itemsLoadingState !== "idle" && (
        <Flex justify="center" css={{ mt: "20%" }}>
          <SpinnerIcon size={rawTheme.spacing[15]} />
        </Flex>
      )}
      {activeOverviewItem && buildData ? (
        <Templates
          name={activeOverviewItem.name}
          data={toWebstudioData(buildData)}
          onOpenChange={(isOpen: boolean) => {
            if (isOpen === false) {
              setAciveOverviewItem(undefined);
            }
          }}
        />
      ) : (
        <Overview
          items={items}
          activeProjectId={activeOverviewItem?.projectId}
          onSelect={(activeOverviewItem) => {
            setAciveOverviewItem(activeOverviewItem);
            getBuildData({ projectId: activeOverviewItem.projectId });
          }}
          openDetailsProjectId={openDetailsProjectId}
          onOpenDetailsProjectIdChange={setOpenDetailsProjectId}
        />
      )}
      {openDetailsItem && (
        <SettingsPanel isOpen>
          <ItemDetails
            item={openDetailsItem}
            onClose={() => {
              setOpenDetailsProjectId(undefined);
            }}
          />
        </SettingsPanel>
      )}
    </Flex>
  );
};

export const Icon = ExtensionIcon;
