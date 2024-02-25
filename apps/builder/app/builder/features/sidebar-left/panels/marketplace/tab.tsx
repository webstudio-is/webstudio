import { ExtensionIcon } from "@webstudio-is/icons";
import { Flex } from "@webstudio-is/design-system";
import type { TabContentProps } from "../../types";
import { Header, CloseButton } from "../../header";
import { Marketplace } from "./marketplace";
import { Templates } from "./template";
import { useActiveProduct } from "./utils";

export const TabContent = ({ onSetActiveTab }: TabContentProps) => {
  const [activeProduct, setActiveProduct] = useActiveProduct();

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
      {activeProduct?.category === "templates" ? (
        <Templates product={activeProduct} onOpenChange={handleOpenChange} />
      ) : (
        <Marketplace />
      )}
    </Flex>
  );
};

export const Icon = ExtensionIcon;
