import { ImageIcon } from "@webstudio-is/icons";
import { Flex } from "@webstudio-is/design-system";
import { ImageManager } from "~/builder/shared/image-manager";
import type { TabContentProps } from "../../types";
import { Header, CloseButton } from "../../header";

export const TabContent = ({ onSetActiveTab }: TabContentProps) => {
  return (
    <Flex direction="column" css={{ height: "100%" }}>
      <Header
        title="Assets"
        suffix={<CloseButton onClick={() => onSetActiveTab("none")} />}
      />
      <ImageManager />
    </Flex>
  );
};

export const Icon = ImageIcon;
