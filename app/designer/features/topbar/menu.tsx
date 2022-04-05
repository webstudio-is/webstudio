import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuArrow,
  DropdownMenuSeparator,
  Flex,
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
} from "~/shared/icons";
import type { Config } from "~/config";
import {
  useIsPreviewMode,
  useIsShareDialogOpen,
  useIsPublishDialogOpen,
} from "../../shared/nano-values";
import { type Publish } from "../canvas-iframe";

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
    <Text size="1" css={{ letterSpacing: 1.5 }}>
      {formattedValue}
    </Text>
  );
};

type MenuProps = {
  config: Config;
  publish: Publish;
};

export const Menu = ({ config, publish }: MenuProps) => {
  const navigate = useNavigate();
  const [, setIsPreviewMode] = useIsPreviewMode();
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
          onSelect={() => {
            navigate(config.dashboardPath);
          }}
        >
          <Flex gap="3" align="center">
            <DashboardIcon /> Dashboard
          </Flex>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            publish<"shortcut", string>({
              type: "shortcut",
              payload: "undo",
            });
          }}
        >
          <Flex gap="3" align="center">
            <UndoIcon /> Undo{" "}
            <Shortcut mac={["cmd", "z"]} win={["ctrl", "z"]} />
          </Flex>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            publish<"shortcut", string>({
              type: "shortcut",
              payload: "redo",
            });
          }}
        >
          <Flex gap="3" align="center">
            <RedoIcon /> Redo{" "}
            <Shortcut
              mac={["shift", "cmd", "z"]}
              win={["shift", "ctrl", "z"]}
            />
          </Flex>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            setIsPreviewMode(true);
          }}
        >
          <Flex gap="3" align="center">
            <EyeOpenIcon /> Preview
          </Flex>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            setIsShareOpen(true);
          }}
        >
          <Flex gap="3" align="center">
            <Share1Icon /> Share
          </Flex>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            setIsPublishOpen(true);
          }}
        >
          <Flex gap="3" align="center">
            <RocketIcon /> Publish
          </Flex>
        </DropdownMenuItem>
        <DropdownMenuArrow offset={10} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
