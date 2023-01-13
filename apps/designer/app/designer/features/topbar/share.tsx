import {
  Button,
  Flex,
  DeprecatedIconButton,
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverTrigger,
  TextField,
} from "@webstudio-is/design-system";
import { Share1Icon } from "@webstudio-is/icons";
import { useIsShareDialogOpen } from "../../shared/nano-states";

type ShareButtonProps = {
  url: string;
};

const Content = ({ url }: ShareButtonProps) => {
  if (typeof location === "undefined") {
    return null;
  }
  return (
    <PopoverContent
      css={{ padding: "$spacing$9" }}
      hideArrow={true}
      onFocusOutside={(event) => {
        // Used to prevent closing when opened from the main dropdown menu
        event.preventDefault();
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          window.open(url, "_blank");
        }}
      >
        <Flex gap="2">
          <TextField
            variant="ghost"
            readOnly
            defaultValue={url}
            onFocus={(event) => {
              event?.target.select();
            }}
          />
          <Button aria-label="Open in a new tab" type="submit">
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
        <DeprecatedIconButton>
          <Share1Icon />
        </DeprecatedIconButton>
      </PopoverTrigger>
      <PopoverPortal>
        <Content {...props} />
      </PopoverPortal>
    </Popover>
  );
};
