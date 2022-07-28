import { useNavigate } from "react-router-dom";
import { type Publish } from "@webstudio-is/react-sdk";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuTriggerItem,
  DropdownMenuCheckboxItem,
  DropdownMenuArrow,
  DropdownMenuSeparator,
  IconButton,
  Box,
} from "@webstudio-is/design-system";
import { HamburgerMenuIcon, ChevronRightIcon } from "@webstudio-is/icons";
import type { Config } from "~/config";
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

const menuItemCss = {
  display: "flex",
  gap: "$3",
  justifyContent: "space-between",
  flexGrow: 1,
  minWidth: 140,
};

const ThemeMenuItem = () => {
  const currentSetting = getThemeSetting();
  const labels: Record<ThemeSetting, string> = {
    light: "Light",
    dark: "Dark",
    system: "System theme",
  };

  const settings = Object.keys(labels) as Array<ThemeSetting>;

  return (
    <DropdownMenu>
      <DropdownMenuTriggerItem>
        Theme
        <ChevronRightIcon />
      </DropdownMenuTriggerItem>
      <DropdownMenuContent>
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

type MenuProps = {
  config: Config;
  publish: Publish;
};

export const Menu = ({ config, publish }: MenuProps) => {
  const navigate = useNavigate();
  const [, setIsShareOpen] = useIsShareDialogOpen();
  const [, setIsPublishOpen] = useIsPublishDialogOpen();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Box
          css={{
            width: "$sizes$7",
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
          <IconButton aria-label="Menu Button">
            <HamburgerMenuIcon />
          </IconButton>
        </Box>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem
          css={menuItemCss}
          onSelect={() => {
            navigate(config.dashboardPath);
          }}
        >
          Dashboard
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          css={menuItemCss}
          onSelect={() => {
            publish<"shortcut", string>({
              type: "shortcut",
              payload: "undo",
            });
          }}
        >
          Undo
          <ShortcutHint value={["cmd", "z"]} />
        </DropdownMenuItem>
        <DropdownMenuItem
          css={menuItemCss}
          onSelect={() => {
            publish<"shortcut", string>({
              type: "shortcut",
              payload: "redo",
            });
          }}
        >
          Redo
          <ShortcutHint value={["shift", "cmd", "z"]} />
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          css={menuItemCss}
          onSelect={() => {
            publish<"shortcut", string>({
              type: "shortcut",
              payload: "copy",
            });
          }}
        >
          Copy
          <ShortcutHint value={["cmd", "c"]} />
        </DropdownMenuItem>
        <DropdownMenuItem
          css={menuItemCss}
          onSelect={() => {
            publish<"shortcut", string>({
              type: "shortcut",
              payload: "paste",
            });
          }}
        >
          Paste
          <ShortcutHint value={["cmd", "v"]} />
        </DropdownMenuItem>
        <DropdownMenuItem
          css={menuItemCss}
          onSelect={() => {
            publish<"shortcut", string>({
              type: "shortcut",
              payload: "delete",
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
          <ShortcutHint value={["cmd", "+"]} />
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
          <ShortcutHint value={["cmd", "-"]} />
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <ThemeMenuItem />
        <DropdownMenuItem
          css={menuItemCss}
          onSelect={() => {
            publish<"togglePreviewMode">({
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
        <DropdownMenuArrow offset={10} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
