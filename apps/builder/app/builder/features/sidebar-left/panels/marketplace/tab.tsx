import { ExtensionIcon } from "@webstudio-is/icons";
import { Flex } from "@webstudio-is/design-system";
import type { TabContentProps } from "../../types";
import { Header, CloseButton } from "../../header";
import { Marketplace } from "./marketplace";
import { Templates } from "./template";
import { builderPath } from "~/shared/router-utils";
import { useFetcher } from "@remix-run/react";
import { useState } from "react";
import { toWebstudioData } from "./utils";
import type { MarketplaceOverviewItem } from "~/shared/marketplace/types";

export const TabContent = ({ onSetActiveTab }: TabContentProps) => {
  const [activeProjectId, setActiveProjectId] =
    useState<MarketplaceOverviewItem>();
  const { load, data } = useFetcher();

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen === false) {
      setActiveProjectId(undefined);
    }
  };

  return (
    <Flex direction="column" css={{ height: "100%" }}>
      <Header
        title="Marketplace"
        suffix={<CloseButton onClick={() => onSetActiveTab("none")} />}
      />
      {activeProjectId && data ? (
        <Templates
          projectId={activeProjectId}
          data={toWebstudioData(data)}
          onOpenChange={handleOpenChange}
        />
      ) : (
        <Marketplace
          activeProjectId={activeProjectId}
          onSelect={(product) => {
            setActiveProjectId(product);
            load();
            //builderPath({
            //  projectId: product.projectId,
            //  authToken: product.authToken,
            //})
          }}
        />
      )}
    </Flex>
  );
};

export const Icon = ExtensionIcon;
