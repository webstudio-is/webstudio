import {
  Button,
  FloatingPanelPopover,
  FloatingPanelPopoverContent,
  FloatingPanelPopoverTitle,
  FloatingPanelPopoverTrigger,
  theme,
} from "@webstudio-is/design-system";
import type { Project } from "@webstudio-is/prisma-client";
import { ShareProjectContainer } from "~/shared/share-project";

export const ShareButton = ({ projectId }: { projectId: Project["id"] }) => {
  return (
    <FloatingPanelPopover modal>
      <FloatingPanelPopoverTrigger asChild>
        <Button>Share</Button>
      </FloatingPanelPopoverTrigger>

      <FloatingPanelPopoverContent css={{ zIndex: theme.zIndices[1] }}>
        <ShareProjectContainer projectId={projectId} />
        <FloatingPanelPopoverTitle>Share</FloatingPanelPopoverTitle>
      </FloatingPanelPopoverContent>
    </FloatingPanelPopover>
  );
};
