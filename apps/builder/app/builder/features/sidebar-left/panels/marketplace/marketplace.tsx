import { ExtensionIcon, SpinnerIcon } from "@webstudio-is/icons";
import { Flex, rawTheme } from "@webstudio-is/design-system";
import type { TabContentProps } from "../../types";
import { Header, CloseButton, Root } from "../../shared/panel";
import { Overview } from "./overview";
import { SectionTemplates } from "./section-templates";
import { marketplacePath } from "~/shared/router-utils";
import { useEffect, useState } from "react";
import { toWebstudioData } from "./utils";
import type { MarketplaceOverviewItem } from "~/shared/marketplace/types";
import type { MarketplaceRouter } from "~/shared/marketplace/router";
import { createTrpcFetchProxy } from "~/shared/remix/trpc-remix-proxy";
import type { Project } from "@webstudio-is/project";
import { ExtendedPanel } from "../../shared/extended-panel";
import { About } from "./about";

const trpc = createTrpcFetchProxy<MarketplaceRouter>(marketplacePath);

export const TabContent = ({ onSetActiveTab }: TabContentProps) => {
  const [activeOverviewItem, setAciveOverviewItem] =
    useState<MarketplaceOverviewItem>();
  const [openAbout, setopenAbout] = useState<Project["id"]>();

  const {
    load: getItems,
    data: items,
    state: itemsLoadingState,
  } = trpc.getItems.useQuery();

  const { load: getBuildData, data: buildData } = trpc.getBuildData.useQuery();

  useEffect(() => {
    getItems();
  }, [getItems]);

  const openAboutItem = items?.find((item) => item.projectId === openAbout);

  return (
    <>
      <Root>
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
          <SectionTemplates
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
            openAbout={openAbout}
            onOpenAbout={setopenAbout}
          />
        )}
      </Root>
      <ExtendedPanel isOpen={openAboutItem !== undefined}>
        <About
          item={openAboutItem}
          onClose={() => {
            setopenAbout(undefined);
          }}
        />
      </ExtendedPanel>
    </>
  );
};

export const Icon = ExtensionIcon;

export const label = "Marketplace";
