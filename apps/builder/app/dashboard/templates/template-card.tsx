import { useState } from "react";
import { Flex, Text, theme } from "@webstudio-is/design-system";
import type { DashboardProject } from "@webstudio-is/dashboard";
import { builderUrl } from "~/shared/router-utils";
import { Card, CardContent, CardFooter } from "../shared/card";
import { ThumbnailWithAbbr, ThumbnailWithImage } from "../shared/thumbnail";
import { CloneProjectDialog } from "~/shared/clone-project";
import { useProjectCard } from "../projects/project-card";

type TemplateCardProps = {
  project: DashboardProject;
};

export const TemplateCard = ({ project }: TemplateCardProps) => {
  const { thumbnailRef, handleKeyDown } = useProjectCard();
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const { title, previewImageAsset } = project;
  return (
    <Card tabIndex={0} onKeyDown={handleKeyDown}>
      <CardContent
        css={{
          background: theme.colors.brandBackgroundProjectCardBack,
          cursor: "default",
        }}
      >
        {previewImageAsset ? (
          <ThumbnailWithImage
            name={previewImageAsset.name}
            ref={thumbnailRef}
            onClick={() => {
              setIsDuplicateDialogOpen(true);
            }}
          />
        ) : (
          <ThumbnailWithAbbr
            title={title}
            ref={thumbnailRef}
            onClick={() => {
              setIsDuplicateDialogOpen(true);
            }}
          />
        )}
      </CardContent>
      <CardFooter>
        <Flex direction="column" justify="around">
          <Text variant="titles" truncate userSelect="text">
            {title}
          </Text>
        </Flex>
      </CardFooter>
      <CloneProjectDialog
        isOpen={isDuplicateDialogOpen}
        onOpenChange={setIsDuplicateDialogOpen}
        project={project}
        onCreate={(projectId) => {
          window.location.href = builderUrl({
            origin: window.origin,
            projectId: projectId,
          });
        }}
      />
    </Card>
  );
};
