import { Flex, Text, Link, buttonStyle } from "@webstudio-is/design-system";
import { useStore } from "@nanostores/react";
import { Main } from "../shared/layout";
import { CreateProject } from "../projects/project-dialogs";
import { $permissions } from "~/shared/nano-states";

export const Welcome = ({
  currentWorkspaceId,
}: {
  currentWorkspaceId?: string;
}) => {
  const permissions = useStore($permissions);
  return (
    <Main>
      <Flex
        direction="column"
        align="center"
        grow
        gap="7"
        css={{ paddingBlock: "20vh" }}
      >
        <Text variant="brandMediumTitle" as="h3">
          Welcome!
        </Text>

        <Flex align="center" gap="3">
          <Link
            className={buttonStyle({ color: "dark" })}
            underline="none"
            href="https://webstudio.is/marketplace/templates/"
            target="_blank"
            color="contrast"
          >
            Start from a template
          </Link>
          {permissions.canCreateProject && (
            <CreateProject
              workspaceId={currentWorkspaceId}
              buttonText="Create a blank project"
            />
          )}
        </Flex>

        <iframe
          width="560"
          height="315"
          src="https://www.youtube-nocookie.com/embed/W43QpuT3fW0?si=eGE-OU8emtIxzKPn"
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        ></iframe>
      </Flex>
    </Main>
  );
};
