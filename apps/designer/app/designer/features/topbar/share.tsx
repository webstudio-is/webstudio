import {
  Button,
  Flex,
  IconButton,
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverTrigger,
  TextField,
} from "@webstudio-is/design-system";
import { Share1Icon } from "@webstudio-is/icons";
import type { Project } from "@webstudio-is/project";
import { useIsShareDialogOpen } from "../../shared/nano-states";

type ShareButtonProps = {
  projectId: Project["id"];
  pagePath: string;
};

const Content = ({ projectId, pagePath }: ShareButtonProps) => {
  if (typeof location === "undefined") {
    return null;
  }
  const url = new URL(
    `${location.protocol}//${location.host}${
      pagePath || "/"
    }?projectId=${projectId}&mode=preview`
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

export const ShareButton = (props: ShareButtonProps) => {
  const [isOpen, setIsOpen] = useIsShareDialogOpen();
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild aria-label="Share project">
        <IconButton>
          <Share1Icon />
        </IconButton>
      </PopoverTrigger>
      <PopoverPortal>
        <Content {...props} />
      </PopoverPortal>
    </Popover>
  );
};
