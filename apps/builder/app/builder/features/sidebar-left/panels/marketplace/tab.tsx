import { ExtensionIcon } from "@webstudio-is/icons";
import { Flex } from "@webstudio-is/design-system";
import type { TabContentProps } from "../../types";
import { Header, CloseButton } from "../../header";
import { Marketplace } from "./marketplace";
import { Templates } from "./templates";
import { builderPath, marketplacePath } from "~/shared/router-utils";
import { useFetcher } from "@remix-run/react";
import { useEffect, useState } from "react";
import { toWebstudioData, type BuildData } from "./utils";
import type { MarketplaceOverviewItem } from "~/shared/marketplace/types";
import type { MarketplaceRouter } from "~/shared/marketplace/router";
import { createTrpcFetchProxy } from "~/shared/remix/trpc-remix-proxy";

const trpc = createTrpcFetchProxy<MarketplaceRouter>(marketplacePath);

export const TabContent = ({ onSetActiveTab }: TabContentProps) => {
  const [activeOverviewItem, setAciveOverviewItem] =
    useState<MarketplaceOverviewItem>();
  const { load, data } = useFetcher<BuildData>();

  const {
    load: loadItems,
    data: items,
    // @todo show loading
    //state: itemsState,
  } = trpc.getItems.useQuery();

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  return (
    <Flex direction="column" css={{ height: "100%" }}>
      <Header
        title="Marketplace"
        suffix={<CloseButton onClick={() => onSetActiveTab("none")} />}
      />
      {activeOverviewItem?.name && data ? (
        <Templates
          name={activeOverviewItem.name}
          data={toWebstudioData(data)}
          onOpenChange={(isOpen: boolean) => {
            if (isOpen === false) {
              setAciveOverviewItem(undefined);
            }
          }}
        />
      ) : (
        <Marketplace
          items={items}
          activeProjectId={activeOverviewItem?.projectId}
          onSelect={(activeOverviewItem) => {
            setAciveOverviewItem(activeOverviewItem);
            load(builderPath({ projectId: activeOverviewItem.projectId }));
          }}
        />
      )}
    </Flex>
  );
};

export const Icon = ExtensionIcon;
