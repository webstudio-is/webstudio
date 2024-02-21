import { useEffect } from "react";
import { ExtensionIcon } from "@webstudio-is/icons";
import { Flex } from "@webstudio-is/design-system";
import type { TabContentProps } from "../../types";
import { Header, CloseButton } from "../../header";
import { Marketplace } from "./marketplace";
import { ProductDialog } from "./product-dialog";
import { ProductPanel } from "./product-panel";
import { insert, subscribeActions, useActiveProduct } from "./utils";
import type { MarketplaceProduct } from "./types";

const useActions = (activeProduct?: MarketplaceProduct) => {
  useEffect(() => {
    return subscribeActions((action) => {
      if (activeProduct === undefined) {
        return;
      }
      if (action.type === "insert") {
        insert({
          instanceId: action.payload,
          projectId: activeProduct.projectId,
          authToken: activeProduct.authToken,
        });
      }
    });
  }, [activeProduct]);
};

export const TabContent = ({ onSetActiveTab }: TabContentProps) => {
  const [activeProduct, setActiveProduct] = useActiveProduct();
  useActions(activeProduct);
  const component = activeProduct?.component ?? "panel";

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
      {component === "dialog" && activeProduct && (
        <ProductDialog
          product={activeProduct}
          onOpenChange={handleOpenChange}
        />
      )}
      {component === "panel" && activeProduct ? (
        <ProductPanel product={activeProduct} onOpenChange={handleOpenChange} />
      ) : (
        <Marketplace />
      )}
    </Flex>
  );
};

export const Icon = ExtensionIcon;
