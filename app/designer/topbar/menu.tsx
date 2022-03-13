import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuArrow,
  Flex,
  IconButton,
} from "~/shared/design-system";
import {
  HamburgerMenuIcon,
  DashboardIcon,
  EyeOpenIcon,
  Share1Icon,
  RocketIcon,
} from "~/shared/icons";
import type { Config } from "~/config";
import {
  useIsPreviewMode,
  useIsShareDialogOpen,
  useIsPublishDialogOpen,
} from "../nano-values";

type MenuProps = {
  config: Config;
};

export const Menu = ({ config }: MenuProps) => {
  const navigate = useNavigate();
  const [, setIsPreviewMode] = useIsPreviewMode();
  const [, setIsShareOpen] = useIsShareDialogOpen();
  const [, setIsPublishOpen] = useIsPublishDialogOpen();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton>
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
