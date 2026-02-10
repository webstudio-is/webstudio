import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  IconButton,
  theme,
} from "@webstudio-is/design-system";
import { EllipsesIcon } from "@webstudio-is/icons";
import type { DialogType } from "./project-dialogs";
import { useDuplicateProject } from "./project-dialogs";
import { builderUrl } from "~/shared/router-utils";

type ProjectMenuProps = {
  projectId: string;
  onOpenChange: (dialog: DialogType) => void;
};

export const ProjectMenu = ({ projectId, onOpenChange }: ProjectMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const handleDuplicateProject = useDuplicateProject(projectId);

  const handleOpenInSafeMode = () => {
    window.location.href = builderUrl({
      origin: window.origin,
      projectId,
      safemode: true,
    });
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <IconButton
          aria-label="Menu Button"
          tabIndex={-1}
          css={{ alignSelf: "center", position: "relative", zIndex: 1 }}
        >
          <EllipsesIcon width={15} height={15} />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" css={{ width: theme.spacing[24] }}>
        <DropdownMenuItem onSelect={handleDuplicateProject}>
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onOpenChange("rename")}>
          Rename
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onOpenChange("share")}>
          Share
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onOpenChange("delete")}>
          Delete
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onOpenChange("tags")}>
          Tags
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onOpenChange("settings")}>
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={handleOpenInSafeMode}>
          Open in safe mode
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
