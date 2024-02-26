import { ExtensionIcon } from "@webstudio-is/icons";
import { Flex } from "@webstudio-is/design-system";
import type { TabContentProps } from "../../types";
import { Header, CloseButton } from "../../header";
import { Marketplace } from "./marketplace";
import { Templates } from "./template";
import { builderPath } from "~/shared/router-utils";
import { useFetcher } from "@remix-run/react";
import { useState } from "react";
import type { MarketplaceProduct } from "./schema";
import { toWebstudioData } from "./utils";

export const TabContent = ({ onSetActiveTab }: TabContentProps) => {
  const [activeProduct, setActiveProduct] = useState<MarketplaceProduct>();
  const { load, data } = useFetcher();

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen === false) {
      setActiveProduct(undefined);
    }
  };

  return (
    <Flex direction="column" css={{ height: "100%" }}>
      <Header
        title="Marketplace"
        suffix={<CloseButton onClick={() => onSetActiveTab("none")} />}
      />
      {activeProduct && data ? (
        <Templates
          product={activeProduct}
          data={toWebstudioData(data)}
          onOpenChange={handleOpenChange}
        />
      ) : (
        <Marketplace
          activeProduct={activeProduct}
          onSelect={(product) => {
            setActiveProduct(product);
            load(
              builderPath({
                projectId: product.projectId,
                authToken: product.authToken,
              })
            );
          }}
        />
      )}
    </Flex>
  );
};

export const Icon = ExtensionIcon;
