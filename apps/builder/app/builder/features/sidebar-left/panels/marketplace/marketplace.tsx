import { ExtensionIcon } from "@webstudio-is/icons";
import { Flex } from "@webstudio-is/design-system";
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

const trpc = createTrpcFetchProxy<MarketplaceRouter>(marketplacePath);

export const TabContent = ({ onSetActiveTab }: TabContentProps) => {
  const [activeOverviewItem, setAciveOverviewItem] =
    useState<MarketplaceOverviewItem>();

  const {
    load: getItems,
    data: overviewItems,
    // @todo show loading
    //state: itemsState,
  } = trpc.getItems.useQuery();

  const {
    load: getBuildData,
    data: buildData,
    // @todo show loading
    //state: itemsState,
  } = trpc.getBuildData.useQuery();

  useEffect(() => {
    getItems();
  }, [getItems]);

  return (
    <Flex direction="column" css={{ height: "100%" }}>
      <Header
        title="Marketplace"
        suffix={<CloseButton onClick={() => onSetActiveTab("none")} />}
      />
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
          items={overviewItems}
          activeProjectId={activeOverviewItem?.projectId}
          onSelect={(activeOverviewItem) => {
            setAciveOverviewItem(activeOverviewItem);
            getBuildData({ projectId: activeOverviewItem.projectId });
          }}
        />
      )}
    </Flex>
  );
};

export const Icon = ExtensionIcon;
