import { useEffect } from "react";
import { ExtensionIcon } from "@webstudio-is/icons";
import { Flex } from "@webstudio-is/design-system";
import type { TabContentProps } from "../../types";
import { Header, CloseButton } from "../../header";
import { Marketplace } from "./marketplace";
import { App } from "./app";
import { Templates } from "./template";
import {
  $activeProductData,
  insert,
  subscribeActions,
  useActiveProduct,
} from "./utils";
import type { MarketplaceProduct } from "./types";
import { useStore } from "@nanostores/react";

const useActions = (activeProduct?: MarketplaceProduct) => {
  const activeProductData = useStore($activeProductData);
  useEffect(() => {
    return subscribeActions((action) => {
      if (activeProduct === undefined || activeProductData === undefined) {
        return;
      }
      if (action.type === "insert") {
        insert({
          instanceId: action.payload,
          data: activeProductData,
        });
      }
    });
  }, [activeProduct, activeProductData]);
};

export const TabContent = ({ onSetActiveTab }: TabContentProps) => {
  const [activeProduct, setActiveProduct] = useActiveProduct();
  useActions(activeProduct);

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
      {activeProduct?.category === "apps" && (
        <App product={activeProduct} onOpenChange={handleOpenChange} />
      )}
      {activeProduct?.category === "templates" ? (
        <Templates product={activeProduct} onOpenChange={handleOpenChange} />
      ) : (
        <Marketplace />
      )}
    </Flex>
  );
};

export const Icon = ExtensionIcon;
