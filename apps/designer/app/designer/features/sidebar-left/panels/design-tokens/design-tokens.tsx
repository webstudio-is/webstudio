import { TokensIcon } from "@webstudio-is/icons";
import { DesignTokensManager } from "~/designer/shared/design-tokens-manager";
import type { Publish } from "~/shared/pubsub";
import { TabName } from "../../types";
import { Header, CloseButton } from "../../lib/header";

export const TabContent = ({
  onSetActiveTab,
  publish,
}: {
  onSetActiveTab: (tabName: TabName) => void;
  publish: Publish;
}) => {
  return (
    <>
      <Header
        title="Design Tokens"
        suffix={<CloseButton onClick={() => onSetActiveTab("none")} />}
      />
      <DesignTokensManager publish={publish} />
    </>
  );
};

export const icon = <TokensIcon />;
