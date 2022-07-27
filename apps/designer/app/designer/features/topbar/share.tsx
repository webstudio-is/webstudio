import {
  Button,
  Flex,
  IconButton,
  Popover,
  PopoverContent,
  PopoverTrigger,
  TextField,
} from "~/shared/design-system";
import { Share1Icon } from "@webstudio-is/icons";
import { type Project } from "@webstudio-is/prisma-client";
import { useIsShareDialogOpen } from "../../shared/nano-states";

type ShareButtonProps = { path: string; project: Project };

const Content = ({ path, project }: ShareButtonProps) => {
  if (typeof location === "undefined") {
    return null;
  }
  const url = new URL(
    `${location.protocol}//${location.host}${path}/${project.id}`
  );
  return (
    <PopoverContent
      css={{ padding: "$3" }}
      onFocusOutside={(event) => {
        // Used to prevent closing when opened from the main dropdown menu
        event.preventDefault();
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          window.open(url.toString(), "_blank");
        }}
      >
        <Flex gap="2">
          <TextField
            variant="ghost"
            readOnly
            defaultValue={url.toString()}
            onFocus={(event) => {
              event?.target.select();
            }}
          />
          <Button aria-label="Open in a new tab" variant="blue" type="submit">
            Open
          </Button>
        </Flex>
      </form>
    </PopoverContent>
  );
};

export const ShareButton = ({ path, project }: ShareButtonProps) => {
  const [isOpen, setIsOpen] = useIsShareDialogOpen();
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild aria-label="Share project">
        <IconButton>
          <Share1Icon />
        </IconButton>
      </PopoverTrigger>
      <Content path={path} project={project} />
    </Popover>
  );
};
