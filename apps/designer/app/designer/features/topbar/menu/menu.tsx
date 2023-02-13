import { useNavigate } from "@remix-run/react";
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
} from "~/designer/shared/nano-states";
import {
  getThemeSetting,
  setThemeSetting,
  type ThemeSetting,
} from "~/shared/theme";
import { useClientSettings } from "~/designer/shared/client-settings";
import { dashboardPath } from "~/shared/router-utils";
import {
  selectedInstanceIdStore,
  useIsPreviewMode,
} from "~/shared/nano-states";
import { deleteInstance } from "~/shared/instance-utils";
import { MenuButton } from "./menu-button";
import { useAuthPermit } from "~/shared/nano-states";
import { zoomIn, zoomOut } from "~/shared/nano-states/breakpoints";

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
  const [isPreviewMode, setIsPreviewMode] = useIsPreviewMode();
  const [authPermit] = useAuthPermit();

  const isPublishDisabled = authPermit !== "own";
  const isShareDisabled = authPermit !== "own";

  const disabledPublishTooltipContent = isPublishDisabled
    ? "Only owner can publish projects"
    : undefined;

  const disabledShareTooltipContent = isPublishDisabled
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
              const selectedInstanceId = selectedInstanceIdStore.get();
              if (selectedInstanceId === undefined) {
                return;
              }
              deleteInstance(selectedInstanceId);
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
          <DropdownMenuItem onSelect={zoomIn}>
            Zoom in
            <DropdownMenuItemRightSlot>
              <ShortcutHint value={["+"]} />
            </DropdownMenuItemRightSlot>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={zoomOut}>
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
              setIsPreviewMode(!isPreviewMode);
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
              disabled={isPublishDisabled}
            >
              Publish
            </DropdownMenuItem>
          </Tooltip>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
};
