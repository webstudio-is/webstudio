import { useStore } from "@nanostores/react";
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
  Tooltip,
  Kbd,
  menuItemCss,
} from "@webstudio-is/design-system";
import {
  $isCloneDialogOpen,
  $isShareDialogOpen,
  $publishDialog,
  $remoteDialog,
} from "~/builder/shared/nano-states";
import { cloneProjectUrl, dashboardUrl } from "~/shared/router-utils";
import {
  $authPermit,
  $authToken,
  $authTokenPermissions,
  $isDesignMode,
  $userPlanFeatures,
} from "~/shared/nano-states";
import { emitCommand } from "~/builder/shared/commands";
import { MenuButton } from "./menu-button";
import { $openProjectSettings } from "~/shared/nano-states/project-settings";
import { UpgradeIcon } from "@webstudio-is/icons";
import { getSetting, setSetting } from "~/builder/shared/client-settings";
import { help } from "~/shared/help";

const ViewMenuItem = () => {
  const navigatorLayout = getSetting("navigatorLayout");

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>View</DropdownMenuSubTrigger>
      <DropdownMenuSubContent width="regular">
        <DropdownMenuCheckboxItem
          checked={navigatorLayout === "undocked"}
          onSelect={() => {
            const setting =
              navigatorLayout === "undocked" ? "docked" : "undocked";
            setSetting("navigatorLayout", setting);
          }}
        >
          Undock navigator
        </DropdownMenuCheckboxItem>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
};

export const Menu = () => {
  const userPlanFeatures = useStore($userPlanFeatures);
  const hasPaidPlan = userPlanFeatures.purchases.length > 0;
  const authPermit = useStore($authPermit);
  const authTokenPermission = useStore($authTokenPermissions);
  const authToken = useStore($authToken);
  const isDesignMode = useStore($isDesignMode);

  const isPublishEnabled = authPermit === "own" || authPermit === "admin";

  const isShareEnabled = authPermit === "own";

  const disabledPublishTooltipContent = isPublishEnabled
    ? undefined
    : "Only owner or admin can publish projects";

  const disabledShareTooltipContent = isShareEnabled
    ? undefined
    : "Only owner can share projects";

  // If authToken is defined, the user is not logged into the current project and must be redirected to the dashboard to clone the project.
  const cloneIsExternal = authToken !== undefined;

  return (
    <DropdownMenu modal={false}>
      <MenuButton />
      <DropdownMenuContent sideOffset={4} collisionPadding={4} width="regular">
        <DropdownMenuItem
          onSelect={() => {
            window.location.href = dashboardUrl({ origin: window.origin });
          }}
        >
          Dashboard
        </DropdownMenuItem>
        <Tooltip side="right" content={undefined}>
          <DropdownMenuItem
            onSelect={() => {
              $openProjectSettings.set("general");
            }}
          >
            Project settings
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
            <Kbd value={["meta", "z"]} />
          </DropdownMenuItemRightSlot>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => emitCommand("redo")}>
          Redo
          <DropdownMenuItemRightSlot>
            <Kbd value={["meta", "shift", "z"]} />
          </DropdownMenuItemRightSlot>
        </DropdownMenuItem>
        {/* https://github.com/webstudio-is/webstudio/issues/499

          <DropdownMenuItem
            onSelect={() => {
              // TODO
            }}
          >
            Copy
            <DropdownMenuItemRightSlot><Kbd value={["meta", "c"]} /></DropdownMenuItemRightSlot>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              // TODO
            }}
          >
            Paste
            <DropdownMenuItemRightSlot><Kbd value={["meta", "v"]} /></DropdownMenuItemRightSlot>
          </DropdownMenuItem>

          */}
        <DropdownMenuItem onSelect={() => emitCommand("deleteInstanceBuilder")}>
          Delete
          <DropdownMenuItemRightSlot>
            <Kbd value={["backspace"]} />
          </DropdownMenuItemRightSlot>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => emitCommand("save")}>
          Save
          <DropdownMenuItemRightSlot>
            <Kbd value={["meta", "s"]} />
          </DropdownMenuItemRightSlot>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => emitCommand("togglePreviewMode")}>
          Preview
          <DropdownMenuItemRightSlot>
            <Kbd value={["meta", "shift", "p"]} />
          </DropdownMenuItemRightSlot>
        </DropdownMenuItem>

        <Tooltip
          side="right"
          sideOffset={10}
          content={disabledShareTooltipContent}
        >
          <DropdownMenuItem
            onSelect={() => {
              $isShareDialogOpen.set(true);
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
              $publishDialog.set("publish");
            }}
            disabled={isPublishEnabled === false}
          >
            Publish
            <DropdownMenuItemRightSlot>
              <Kbd value={["shift", "P"]} />
            </DropdownMenuItemRightSlot>
          </DropdownMenuItem>
        </Tooltip>

        <Tooltip
          side="right"
          sideOffset={10}
          content={disabledPublishTooltipContent}
        >
          <DropdownMenuItem
            onSelect={() => {
              $publishDialog.set("export");
            }}
            disabled={isPublishEnabled === false}
          >
            Export
            <DropdownMenuItemRightSlot>
              <Kbd value={["shift", "E"]} />
            </DropdownMenuItemRightSlot>
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
              if ($authToken.get() === undefined) {
                $isCloneDialogOpen.set(true);
                return;
              }
            }}
            disabled={authTokenPermission.canClone === false}
            asChild={cloneIsExternal}
          >
            {cloneIsExternal ? (
              <a
                className={menuItemCss()}
                href={cloneProjectUrl({
                  origin: window.origin,
                  sourceAuthToken: authToken,
                })}
              >
                Clone
              </a>
            ) : (
              "Clone"
            )}
          </DropdownMenuItem>
        </Tooltip>

        <DropdownMenuSeparator />

        {isDesignMode && (
          <DropdownMenuItem onSelect={() => emitCommand("openCommandPanel")}>
            Search & commands
            <DropdownMenuItemRightSlot>
              <Kbd value={["meta", "k"]} />
            </DropdownMenuItemRightSlot>
          </DropdownMenuItem>
        )}

        <DropdownMenuItem onSelect={() => emitCommand("openKeyboardShortcuts")}>
          Keyboard shortcuts
          <DropdownMenuItemRightSlot>
            <Kbd value={["shift", "?"]} />
          </DropdownMenuItemRightSlot>
        </DropdownMenuItem>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Help</DropdownMenuSubTrigger>
          <DropdownMenuSubContent width="regular">
            {help.map((item) => (
              <DropdownMenuItem
                key={item.url}
                onSelect={(event) => {
                  if ("target" in item && item.target === "embed") {
                    event.preventDefault();
                    $remoteDialog.set({
                      title: item.label,
                      url: item.url,
                    });
                    return;
                  }
                  window.open(item.url);
                }}
              >
                {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {hasPaidPlan === false && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                window.open("https://webstudio.is/pricing");
              }}
              css={{ gap: theme.spacing[3] }}
            >
              <UpgradeIcon />
              <div>Upgrade to Pro</div>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
