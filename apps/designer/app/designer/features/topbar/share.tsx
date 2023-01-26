import {
  DeprecatedIconButton,
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverTrigger,
} from "@webstudio-is/design-system";
import { Share1Icon } from "@webstudio-is/icons";
import { useIsShareDialogOpen } from "../../shared/nano-states";
import { theme } from "@webstudio-is/design-system";
import { ShareProject } from "~/shared/share-project/share-project";

type ShareButtonProps = {
  url: string;
};

const Content = ({ url }: ShareButtonProps) => {
  if (typeof location === "undefined") {
    return null;
  }
  return (
    <PopoverContent
      css={{ padding: theme.spacing[9] }}
      hideArrow={true}
      onFocusOutside={(event) => {
        // Used to prevent closing when opened from the main dropdown menu
        event.preventDefault();
      }}
    >
      <ShareProject url={url} />
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
