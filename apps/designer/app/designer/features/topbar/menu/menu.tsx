import { useNavigate } from "react-router-dom";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuItemRightSlot,
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
import { HamburgerMenuIcon } from "@webstudio-is/icons";
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
      <DropdownMenuSubTrigger>Theme</DropdownMenuSubTrigger>
      <DropdownMenuSubContent width="regular">
        {settings.map((setting) => (
          <DropdownMenuCheckboxItem
            key={setting}
            checked={currentSetting === setting}
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
      <DropdownMenuSubTrigger>View</DropdownMenuSubTrigger>
      <DropdownMenuSubContent width="regular">
        <DropdownMenuCheckboxItem
          checked={clientSettings.navigatorLayout === "undocked"}
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
          width="regular"
        >
          <DropdownMenuItem
            onSelect={() => {
              navigate(dashboardPath());
            }}
          >
            Dashboard
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              publish({
                type: "shortcut",
                payload: { name: "undo" },
              });
            }}
          >
            Undo
            <DropdownMenuItemRightSlot>
              <ShortcutHint value={["cmd", "z"]} />
            </DropdownMenuItemRightSlot>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              publish({
                type: "shortcut",
                payload: { name: "redo" },
              });
            }}
          >
            Redo
            <DropdownMenuItemRightSlot>
              <ShortcutHint value={["shift", "cmd", "z"]} />
            </DropdownMenuItemRightSlot>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {/* https://github.com/webstudio-is/webstudio-designer/issues/499
          
          <DropdownMenuItem
            onSelect={() => {
              // TODO
            }}
          >
            Copy
            <DropdownMenuItemRightSlot><ShortcutHint value={["cmd", "c"]} /></DropdownMenuItemRightSlot>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              // TODO
            }}
          >
            Paste
            <DropdownMenuItemRightSlot><ShortcutHint value={["cmd", "v"]} /></DropdownMenuItemRightSlot>
          </DropdownMenuItem> 
          
          */}
          <DropdownMenuItem
            onSelect={() => {
              publish({
                type: "shortcut",
                payload: { name: "delete" },
              });
            }}
          >
            Delete
            <DropdownMenuItemRightSlot>
              <ShortcutHint value={["backspace"]} />
            </DropdownMenuItemRightSlot>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              publish({ type: "openBreakpointsMenu" });
            }}
          >
            Breakpoints
            <DropdownMenuItemRightSlot>
              <ShortcutHint value={["cmd", "b"]} />
            </DropdownMenuItemRightSlot>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              publish({
                type: "zoom",
                payload: "zoomIn",
              });
            }}
          >
            Zoom in
            <DropdownMenuItemRightSlot>
              <ShortcutHint value={["+"]} />
            </DropdownMenuItemRightSlot>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              publish({
                type: "zoom",
                payload: "zoomOut",
              });
            }}
          >
            Zoom out
            <DropdownMenuItemRightSlot>
              <ShortcutHint value={["-"]} />
            </DropdownMenuItemRightSlot>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <ThemeMenuItem />
          <ViewMenuItem />
          <DropdownMenuItem
            onSelect={() => {
              publish({
                type: "togglePreviewMode",
              });
            }}
          >
            Preview
            <DropdownMenuItemRightSlot>
              <ShortcutHint value={["cmd", "shift", "p"]} />
            </DropdownMenuItemRightSlot>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              setIsShareOpen(true);
            }}
          >
            Share
          </DropdownMenuItem>
          <DropdownMenuItem
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
