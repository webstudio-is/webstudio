import { TokensIcon } from "@webstudio-is/icons";
import { Flex } from "@webstudio-is/design-system";
import { DesignTokensManager } from "~/designer/shared/design-tokens-manager";
import { TabName } from "../../types";
import { Header, CloseButton } from "../../header";

export const TabContent = ({
  onSetActiveTab,
}: {
  onSetActiveTab: (tabName: TabName) => void;
}) => {
  return (
    <Flex direction="column" css={{ height: "100%" }}>
      <Header
        title="Design Tokens"
        suffix={<CloseButton onClick={() => onSetActiveTab("none")} />}
      />
      <DesignTokensManager />
    </Flex>
  );
};

export const icon = <TokensIcon />;
