import { useNavigate } from "@remix-run/react";
import { useStore } from "@nanostores/react";
import store from "immerhin";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";
import {
  theme,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuItemRightSlot,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuPortal,
  Tooltip,
} from "@webstudio-is/design-system";
import type { Publish } from "~/shared/pubsub";
import { ShortcutHint } from "./shortcut-hint";
import {
  useIsShareDialogOpen,
  useIsPublishDialogOpen,
} from "~/builder/shared/nano-states";
import {
  getThemeSetting,
  setThemeSetting,
  type ThemeSetting,
} from "~/shared/theme";
import { useClientSettings } from "~/builder/shared/client-settings";
import { dashboardPath } from "~/shared/router-utils";
import { $isPreviewMode, $authPermit } from "~/shared/nano-states";
import { deleteSelectedInstance } from "~/shared/instance-utils";
import { MenuButton } from "./menu-button";

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
  const isPreviewMode = useStore($isPreviewMode);
  const authPermit = useStore($authPermit);

  const isPublishEnabled = authPermit === "own" || authPermit === "admin";

  const isShareDisabled = authPermit !== "own";

  const disabledPublishTooltipContent = isPublishEnabled
    ? undefined
    : "Only owner or admin can publish projects";

  const disabledShareTooltipContent = isShareDisabled
    ? "Only owner can share projects"
    : undefined;

  return (
    <DropdownMenu>
      <MenuButton />
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
          <DropdownMenuItem onSelect={() => store.undo()}>
            Undo
            <DropdownMenuItemRightSlot>
              <ShortcutHint value={["cmd", "z"]} />
            </DropdownMenuItemRightSlot>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => store.redo()}>
            Redo
            <DropdownMenuItemRightSlot>
              <ShortcutHint value={["shift", "cmd", "z"]} />
            </DropdownMenuItemRightSlot>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {/* https://github.com/webstudio-is/webstudio/issues/499

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
          <DropdownMenuItem onSelect={deleteSelectedInstance}>
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
          <DropdownMenuSeparator />
          <ThemeMenuItem />
          <ViewMenuItem />
          <DropdownMenuItem
            onSelect={() => {
              $isPreviewMode.set(isPreviewMode === false);
            }}
          >
            Preview
            <DropdownMenuItemRightSlot>
              <ShortcutHint value={["cmd", "shift", "p"]} />
            </DropdownMenuItemRightSlot>
          </DropdownMenuItem>

          <Tooltip side="right" content={disabledShareTooltipContent}>
            <DropdownMenuItem
              onSelect={() => {
                setIsShareOpen(true);
              }}
              disabled={isShareDisabled}
            >
              Share
            </DropdownMenuItem>
          </Tooltip>

          <Tooltip side="right" content={disabledPublishTooltipContent}>
            <DropdownMenuItem
              onSelect={() => {
                setIsPublishOpen(true);
              }}
              disabled={isPublishEnabled === false}
            >
              Publish
            </DropdownMenuItem>
          </Tooltip>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
};
