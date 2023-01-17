import { useNavigate } from "react-router-dom";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuTrigger,
  DropdownMenuSubTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuPortal,
  DeprecatedIconButton,
  Box,
} from "@webstudio-is/design-system";
import { HamburgerMenuIcon, ChevronRightIcon } from "@webstudio-is/icons";
import { type Publish } from "~/shared/pubsub";
import { ShortcutHint } from "./shortcut-hint";
import {
  useIsShareDialogOpen,
  useIsPublishDialogOpen,
} from "~/designer/shared/nano-states";
import {
  getThemeSetting,
  setThemeSetting,
  type ThemeSetting,
} from "~/shared/theme";
import { useClientSettings } from "~/designer/shared/client-settings";
import { dashboardPath } from "~/shared/router-utils";
import { theme } from "@webstudio-is/design-system";

const menuItemCss = {
  display: "flex",
  gap: theme.spacing[9],
  justifyContent: "space-between",
  flexGrow: 1,
  minWidth: 140,
};

const ThemeMenuItem = () => {
  if (isFeatureEnabled("dark") === false) {
    return null;
  }
  const currentSetting = getThemeSetting();
  const labels: Record<ThemeSetting, string> = {
    light: "Light",
    dark: "Dark",
    system: "System theme",
  };

  const settings = Object.keys(labels) as Array<ThemeSetting>;

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        Theme
        <ChevronRightIcon />
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        {settings.map((setting) => (
          <DropdownMenuCheckboxItem
            key={setting}
            checked={currentSetting === setting}
            css={menuItemCss}
            onSelect={() => {
              setThemeSetting(setting);
            }}
          >
            {labels[setting]}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
};

const ViewMenuItem = () => {
  const [clientSettings, setClientSetting] = useClientSettings();

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        View
        <ChevronRightIcon />
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuCheckboxItem
          checked={clientSettings.navigatorLayout === "undocked"}
          css={menuItemCss}
          onSelect={() => {
            const setting =
              clientSettings.navigatorLayout === "undocked"
                ? "docked"
                : "undocked";
            setClientSetting("navigatorLayout", setting);
          }}
        >
          Undock navigator
        </DropdownMenuCheckboxItem>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
};

type MenuProps = {
  publish: Publish;
};

export const Menu = ({ publish }: MenuProps) => {
  const navigate = useNavigate();
  const [, setIsShareOpen] = useIsShareDialogOpen();
  const [, setIsPublishOpen] = useIsPublishDialogOpen();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Box
          css={{
            width: theme.spacing[17],
            height: "100%",
            borderRadius: "0",
            outline: "none",
            // @todo: would set directly on the element
            "& > button": {
              width: "inherit",
              height: "inherit",
            },
          }}
        >
          <DeprecatedIconButton aria-label="Menu Button">
            <HamburgerMenuIcon />
          </DeprecatedIconButton>
        </Box>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent
          css={{ zIndex: theme.zIndices[1] }}
          sideOffset={4}
          collisionPadding={4}
        >
          <DropdownMenuItem
            css={menuItemCss}
            onSelect={() => {
              navigate(dashboardPath());
            }}
          >
            Dashboard
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            css={menuItemCss}
            onSelect={() => {
              publish({
                type: "shortcut",
                payload: { name: "undo" },
              });
            }}
          >
            Undo
            <ShortcutHint value={["cmd", "z"]} />
          </DropdownMenuItem>
          <DropdownMenuItem
            css={menuItemCss}
            onSelect={() => {
              publish({
                type: "shortcut",
                payload: { name: "redo" },
              });
            }}
          >
            Redo
            <ShortcutHint value={["shift", "cmd", "z"]} />
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {/* https://github.com/webstudio-is/webstudio-designer/issues/499
          
          <DropdownMenuItem
            css={menuItemCss}
            onSelect={() => {
              // TODO
            }}
          >
            Copy
            <ShortcutHint value={["cmd", "c"]} />
          </DropdownMenuItem>
          <DropdownMenuItem
            css={menuItemCss}
            onSelect={() => {
              // TODO
            }}
          >
            Paste
            <ShortcutHint value={["cmd", "v"]} />
          </DropdownMenuItem> 
          
          */}
          <DropdownMenuItem
            css={menuItemCss}
            onSelect={() => {
              publish({
                type: "shortcut",
                payload: { name: "delete" },
              });
            }}
          >
            Delete
            <ShortcutHint value={["backspace"]} />
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            css={menuItemCss}
            onSelect={() => {
              publish({ type: "openBreakpointsMenu" });
            }}
          >
            Breakpoints
            <ShortcutHint value={["cmd", "b"]} />
          </DropdownMenuItem>
          <DropdownMenuItem
            css={menuItemCss}
            onSelect={() => {
              publish({
                type: "zoom",
                payload: "zoomIn",
              });
            }}
          >
            Zoom in
            <ShortcutHint value={["+"]} />
          </DropdownMenuItem>
          <DropdownMenuItem
            css={menuItemCss}
            onSelect={() => {
              publish({
                type: "zoom",
                payload: "zoomOut",
              });
            }}
          >
            Zoom out
            <ShortcutHint value={["-"]} />
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <ThemeMenuItem />
          <ViewMenuItem />
          <DropdownMenuItem
            css={menuItemCss}
            onSelect={() => {
              publish({
                type: "togglePreviewMode",
              });
            }}
          >
            Preview
            <ShortcutHint value={["cmd", "shift", "p"]} />
          </DropdownMenuItem>
          <DropdownMenuItem
            css={menuItemCss}
            onSelect={() => {
              setIsShareOpen(true);
            }}
          >
            Share
          </DropdownMenuItem>
          <DropdownMenuItem
            css={menuItemCss}
            onSelect={() => {
              setIsPublishOpen(true);
            }}
          >
            Publish
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
};
