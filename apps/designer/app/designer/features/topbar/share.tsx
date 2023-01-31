import {
  Button,
  DeprecatedIconButton,
  DeprecatedPopover,
  DeprecatedPopoverTrigger,
  DeprecatedPopoverContent,
  DeprecatedPopoverPortal,
} from "@webstudio-is/design-system";
import { Share1Icon } from "@webstudio-is/icons";
import { useIsShareDialogOpen } from "../../shared/nano-states";
import { theme } from "@webstudio-is/design-system";
import {
  ShareProjectDeprecated,
  ShareProject,
  LinkOptions,
} from "~/shared/share-project";

type ShareButtonDeprecatedProps = {
  url: string;
};

const Content = ({ url }: ShareButtonDeprecatedProps) => {
  if (typeof location === "undefined") {
    return null;
  }
  return (
    <DeprecatedPopoverContent
      css={{ padding: theme.spacing[9] }}
      hideArrow={true}
      onFocusOutside={(event) => {
        // Used to prevent closing when opened from the main dropdown menu
        event.preventDefault();
      }}
    >
      <ShareProjectDeprecated url={url} />
    </DeprecatedPopoverContent>
  );
};

export const ShareButtonDeprecated = (props: ShareButtonDeprecatedProps) => {
  const [isOpen, setIsOpen] = useIsShareDialogOpen();
  return (
    <DeprecatedPopover open={isOpen} onOpenChange={setIsOpen}>
      <DeprecatedPopoverTrigger asChild aria-label="Share project">
        <DeprecatedIconButton>
          <Share1Icon />
        </DeprecatedIconButton>
      </DeprecatedPopoverTrigger>
      <DeprecatedPopoverPortal>
        <Content {...props} />
      </DeprecatedPopoverPortal>
    </DeprecatedPopover>
  );
};

export const ShareButton = () => {
  const handleChange = (link: LinkOptions) => {
    // @todo implement
  };
  const handleDelete = (link: LinkOptions) => {
    // @todo implement
  };
  const handleCreate = () => {
    // @todo implement
  };
  return (
    <ShareProject
      onChange={handleChange}
      onDelete={handleDelete}
      onCreate={handleCreate}
    >
      <Button>Share</Button>
    </ShareProject>
  );
};
