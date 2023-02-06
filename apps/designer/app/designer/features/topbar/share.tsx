import {
  Button,
  FloatingPanelPopover,
  FloatingPanelPopoverContent,
  FloatingPanelPopoverTitle,
  FloatingPanelPopoverTrigger,
  FloatingPanelAnchor,
  theme,
  Tooltip,
} from "@webstudio-is/design-system";
import type { Project } from "@webstudio-is/prisma-client";
import { ShareProjectContainer } from "~/shared/share-project";
import { useAuthPermit } from "~/shared/nano-states";

export const ShareButton = ({ projectId }: { projectId: Project["id"] }) => {
  const [authPermit] = useAuthPermit();

  const isShareDisabled = authPermit === "view";
  const tooltipContent = isShareDisabled
    ? "Only owner can share projects"
    : undefined;

  return (
    <FloatingPanelPopover modal>
      <FloatingPanelAnchor>
        <Tooltip side="bottom" content={tooltipContent}>
          <FloatingPanelPopoverTrigger asChild>
            <Button disabled={isShareDisabled}>Share</Button>
          </FloatingPanelPopoverTrigger>
        </Tooltip>
      </FloatingPanelAnchor>

      <FloatingPanelPopoverContent css={{ zIndex: theme.zIndices[1] }}>
        <ShareProjectContainer projectId={projectId} />
        <FloatingPanelPopoverTitle>Share</FloatingPanelPopoverTitle>
      </FloatingPanelPopoverContent>
    </FloatingPanelPopover>
  );
};
