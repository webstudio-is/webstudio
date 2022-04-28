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
import { ShortcutHint } from "./shortcut-hint";
import {
  useIsShareDialogOpen,
  useIsPublishDialogOpen,
} from "~/designer/shared/nano-values";
import { type Publish } from "~/designer/shared/canvas-iframe";

const menuItemCss = {
  display: "flex",
  gap: "$3",
  justifyContent: "start",
  flexGrow: 1,
};

const textCss = {
  flexGrow: 1,
  fontSize: "$1",
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
          <UndoIcon />
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
          <RedoIcon />
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
          <CopyIcon />
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
          <ClipboardCopyIcon />
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
          <TrashIcon />
          <Text css={textCss}>Delete</Text>
          <ShortcutHint value={["backspace"]} />
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
          <EyeOpenIcon />
          <Text css={textCss}>Preview</Text>
          <ShortcutHint value={["cmd", "shift", "p"]} />
        </DropdownMenuItem>
        <DropdownMenuItem
          css={menuItemCss}
          onSelect={() => {
            setIsShareOpen(true);
          }}
        >
          <Share1Icon />
          <Text css={textCss}>Share</Text>
        </DropdownMenuItem>
        <DropdownMenuItem
          css={menuItemCss}
          onSelect={() => {
            setIsPublishOpen(true);
          }}
        >
          <RocketIcon />
          <Text css={textCss}>Publish</Text>
        </DropdownMenuItem>
        <DropdownMenuArrow offset={10} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
