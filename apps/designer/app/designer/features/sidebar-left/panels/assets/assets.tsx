import { ImageIcon } from "@webstudio-is/icons";
import { Flex } from "@webstudio-is/design-system";
import { ImageManager } from "~/designer/shared/image-manager";
import type { TabName } from "../../types";
import { Header, CloseButton } from "../../header";

export const TabContent = ({
  onSetActiveTab,
}: {
  onSetActiveTab: (tabName: TabName) => void;
}) => {
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

export const icon = <ImageIcon />;
