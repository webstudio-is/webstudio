import { useNavigate } from "@remix-run/react";
import { useStore } from "@nanostores/react";
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
  Kbd,
} from "@webstudio-is/design-system";
import {
  useIsShareDialogOpen,
  useIsPublishDialogOpen,
  $userPlanFeatures,
  $isCloneDialogOpen,
} from "~/builder/shared/nano-states";
import {
  getThemeSetting,
  setThemeSetting,
  type ThemeSetting,
} from "~/shared/theme";
import { useClientSettings } from "~/builder/shared/client-settings";
import { dashboardPath } from "~/shared/router-utils";
import { $authPermit, $authTokenPermissions } from "~/shared/nano-states";
import { emitCommand } from "~/builder/shared/commands";
import { MenuButton } from "./menu-button";
import { $isProjectSettingsOpen } from "~/shared/nano-states/seo";
import { UploadIcon } from "@webstudio-is/icons";

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

export const Menu = () => {
  const navigate = useNavigate();
  const [, setIsShareOpen] = useIsShareDialogOpen();
  const [, setIsPublishOpen] = useIsPublishDialogOpen();
  const { hasProPlan } = useStore($userPlanFeatures);
  const authPermit = useStore($authPermit);
  const authTokenPermission = useStore($authTokenPermissions);

  const isPublishEnabled = authPermit === "own" || authPermit === "admin";

  const isShareEnabled = authPermit === "own";

  const disabledPublishTooltipContent = isPublishEnabled
    ? undefined
    : "Only owner or admin can publish projects";

  const disabledShareTooltipContent = isShareEnabled
    ? undefined
    : "Only owner can share projects";

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
          <Tooltip side="right" content={undefined}>
            <DropdownMenuItem
              onSelect={() => {
                $isProjectSettingsOpen.set(true);
              }}
            >
              Project Settings
            </DropdownMenuItem>
          </Tooltip>
          <DropdownMenuItem onSelect={() => emitCommand("openBreakpointsMenu")}>
            Breakpoints
          </DropdownMenuItem>
          <ViewMenuItem />
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => emitCommand("undo")}>
            Undo
            <DropdownMenuItemRightSlot>
              <Kbd value={["cmd", "z"]} />
            </DropdownMenuItemRightSlot>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => emitCommand("redo")}>
            Redo
            <DropdownMenuItemRightSlot>
              <Kbd value={["shift", "cmd", "z"]} />
            </DropdownMenuItemRightSlot>
          </DropdownMenuItem>
          {/* https://github.com/webstudio-is/webstudio/issues/499

          <DropdownMenuItem
            onSelect={() => {
              // TODO
            }}
          >
            Copy
            <DropdownMenuItemRightSlot><Kbd value={["cmd", "c"]} /></DropdownMenuItemRightSlot>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              // TODO
            }}
          >
            Paste
            <DropdownMenuItemRightSlot><Kbd value={["cmd", "v"]} /></DropdownMenuItemRightSlot>
          </DropdownMenuItem>

          */}
          <DropdownMenuItem onSelect={() => emitCommand("deleteInstance")}>
            Delete
            <DropdownMenuItemRightSlot>
              <Kbd value={["backspace"]} />
            </DropdownMenuItemRightSlot>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <ThemeMenuItem />
          <DropdownMenuItem onSelect={() => emitCommand("togglePreview")}>
            Preview
            <DropdownMenuItemRightSlot>
              <Kbd value={["cmd", "shift", "p"]} />
            </DropdownMenuItemRightSlot>
          </DropdownMenuItem>

          <Tooltip
            side="right"
            sideOffset={10}
            content={disabledShareTooltipContent}
          >
            <DropdownMenuItem
              onSelect={() => {
                setIsShareOpen(true);
              }}
              disabled={isShareEnabled === false}
            >
              Share
            </DropdownMenuItem>
          </Tooltip>

          <Tooltip
            side="right"
            sideOffset={10}
            content={disabledPublishTooltipContent}
          >
            <DropdownMenuItem
              onSelect={() => {
                setIsPublishOpen(true);
              }}
              disabled={isPublishEnabled === false}
            >
              Publish
            </DropdownMenuItem>
          </Tooltip>

          <Tooltip
            side="right"
            sideOffset={10}
            content={
              authTokenPermission.canClone === false
                ? "Cloning has been disabled by the project owner"
                : undefined
            }
          >
            <DropdownMenuItem
              onSelect={() => {
                $isCloneDialogOpen.set(true);
              }}
              disabled={authTokenPermission.canClone === false}
            >
              Clone
            </DropdownMenuItem>
          </Tooltip>

          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              window.open("https://docs.webstudio.is");
            }}
          >
            Learn Webstudio
          </DropdownMenuItem>
          {hasProPlan === false && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => {
                  window.open("https://webstudio.is/pricing");
                }}
                css={{ gap: theme.spacing[3] }}
              >
                <UploadIcon />
                <div>Upgrade to Pro</div>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
};
