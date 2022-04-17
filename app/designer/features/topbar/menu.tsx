import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuArrow,
  DropdownMenuSeparator,
  IconButton,
  Text,
} from "~/shared/design-system";
import {
  HamburgerMenuIcon,
  DashboardIcon,
  EyeOpenIcon,
  Share1Icon,
  RocketIcon,
  UndoIcon,
  RedoIcon,
  TrashIcon,
  ClipboardCopyIcon,
  CopyIcon,
} from "~/shared/icons";
import type { Config } from "~/config";
import {
  useIsShareDialogOpen,
  useIsPublishDialogOpen,
} from "../../shared/nano-values";
import { type Publish } from "../../shared/canvas-iframe";

const isMac =
  typeof navigator === "object" ? /mac/i.test(navigator.platform) : false;
const shortcutsMap: Record<string, string> = {
  cmd: "⌘",
  ctrl: "⌃",
  shift: "⇧",
  option: "⌥",
  backspace: "⌫",
};

const Shortcut = ({ mac, win }: { mac: Array<string>; win: Array<string> }) => {
  // @todo check what linux needs
  const value = isMac ? mac : win;
  const formattedValue = value.map(
    (char) => shortcutsMap[char] ?? char.toUpperCase()
  );
  return (
    <Text
      size="1"
      css={{ letterSpacing: 1.5, textAlign: "right", flexGrow: 1 }}
    >
      {formattedValue}
    </Text>
  );
};

const menuItemCss = {
  display: "flex",
  gap: "$3",
  justifyContent: "start",
  flexGrow: 1,
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
          <DashboardIcon /> Dashboard
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
          <UndoIcon /> Undo
          <Shortcut mac={["cmd", "z"]} win={["ctrl", "z"]} />
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
          <RedoIcon /> Redo
          <Shortcut mac={["shift", "cmd", "z"]} win={["shift", "ctrl", "z"]} />
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
          <CopyIcon /> Copy
          <Shortcut mac={["cmd", "c"]} win={["ctrl", "c"]} />
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
          <ClipboardCopyIcon /> Paste
          <Shortcut mac={["cmd", "v"]} win={["ctrl", "v"]} />
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
          <TrashIcon /> Delete
          <Shortcut mac={["backspace"]} win={["backspace"]} />
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          css={menuItemCss}
          onSelect={() => {
            publish<"togglePreviewMode">({
              type: "togglePreviewMode",
            });
          }}
        >
          <EyeOpenIcon /> Preview
          <Shortcut mac={["cmd", "shift", "p"]} win={["ctrl", "shift", "p"]} />
        </DropdownMenuItem>
        <DropdownMenuItem
          css={menuItemCss}
          onSelect={() => {
            setIsShareOpen(true);
          }}
        >
          <Share1Icon /> Share
        </DropdownMenuItem>
        <DropdownMenuItem
          css={menuItemCss}
          onSelect={() => {
            setIsPublishOpen(true);
          }}
        >
          <RocketIcon /> Publish
        </DropdownMenuItem>
        <DropdownMenuArrow offset={10} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
