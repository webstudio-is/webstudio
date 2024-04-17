import { Flex, Separator } from "@webstudio-is/design-system";
import { NavigatorTree } from "~/builder/shared/navigator-tree";
import { Header, CloseButton, Root } from "../../shared/panel";
import { CssPreview } from "./css-preview";
import { useHotkeys } from "react-hotkeys-hook";
import { emitCommand } from "~/builder/shared/commands";
import {
  useClientSettings,
  type Settings,
} from "~/builder/shared/client-settings";

export const useNavigatorLayout = (
  onChange?: (navigatorLayout: Settings["navigatorLayout"]) => void
) => {
  // We need to render the detached state only once the setting was actually loaded from local storage.
  // Otherwise we may show the detached state because its the default and then hide it immediately.
  const [clientSettings, _, isLoaded] = useClientSettings();
  const navigatorLayout = isLoaded
    ? clientSettings.navigatorLayout
    : "undocked";
  onChange?.(navigatorLayout);
  return navigatorLayout;
};

type NavigatorProps = {
  isClosable?: boolean;
  onClose?: () => void;
};

export const NavigatorContent = ({
  isClosable = true,
  onClose,
}: NavigatorProps) => {
  const shortcutRef = useHotkeys<HTMLDivElement>(
    "enter",
    () => emitCommand("editInstanceText"),
    []
  );

  return (
    <Root ref={shortcutRef}>
      <Header
        title="Navigator"
        suffix={isClosable && <CloseButton onClick={() => onClose?.()} />}
      />
      <Flex grow direction="column" justify="end">
        <NavigatorTree />
        <Separator />
        <CssPreview />
      </Flex>
    </Root>
  );
};
