import { ImageIcon } from "@webstudio-is/icons";
import { ImageManager } from "~/designer/shared/image-manager";
import { TabName } from "../../types";
import { Header, CloseButton } from "../../lib/header";
import { Flex } from "@webstudio-is/design-system";

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
