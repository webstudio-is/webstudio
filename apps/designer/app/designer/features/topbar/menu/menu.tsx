import { useNavigate } from "react-router-dom";
import { type Publish } from "@webstudio-is/sdk";
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
  Text,
} from "~/shared/design-system";
import { HamburgerMenuIcon, ChevronRightIcon } from "~/shared/icons";
import type { Config } from "~/config";
import { ShortcutHint } from "./shortcut-hint";
import {
  useIsShareDialogOpen,
  useIsPublishDialogOpen,
} from "~/designer/shared/nano-states";
import { isFeatureEnabled } from "~/shared/feature-flags";
import {
  getThemeSetting,
  setThemeSetting,
  type ThemeSetting,
} from "~/shared/theme";

const menuItemCss = {
  display: "flex",
  gap: "$3",
  justifyContent: "start",
  flexGrow: 1,
  minWidth: 140,
};

const textCss = {
  flexGrow: 1,
  fontSize: "$1",
};

const ThemeMenuItem = () => {
  if (isFeatureEnabled("theme") === false) return null;
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
        <Text css={textCss}>Theme</Text>
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
            <Text css={textCss}>{labels[setting]}</Text>
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
        <IconButton aria-label="Menu Button">
          <HamburgerMenuIcon />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem
          css={menuItemCss}
          onSelect={() => {
            navigate(config.dashboardPath);
          }}
        >
          <Text css={textCss}>Dashboard</Text>
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
          <Text css={textCss}>Undo</Text>
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
          <Text css={textCss}>Redo</Text>
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
          <Text css={textCss}>Copy</Text>
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
          <Text css={textCss}>Paste</Text>
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
          <Text css={textCss}>Delete</Text>
          <ShortcutHint value={["backspace"]} />
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          css={menuItemCss}
          onSelect={() => {
            publish({ type: "openBreakpointsMenu" });
          }}
        >
          <Text css={textCss}>Breakpoints</Text>
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
          <Text css={textCss}>Zoom in</Text>
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
          <Text css={textCss}>Zoom out</Text>
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
          <Text css={textCss}>Preview</Text>
          <ShortcutHint value={["cmd", "shift", "p"]} />
        </DropdownMenuItem>
        <DropdownMenuItem
          css={menuItemCss}
          onSelect={() => {
            setIsShareOpen(true);
          }}
        >
          <Text css={textCss}>Share</Text>
        </DropdownMenuItem>
        <DropdownMenuItem
          css={menuItemCss}
          onSelect={() => {
            setIsPublishOpen(true);
          }}
        >
          <Text css={textCss}>Publish</Text>
        </DropdownMenuItem>
        <DropdownMenuArrow offset={10} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
