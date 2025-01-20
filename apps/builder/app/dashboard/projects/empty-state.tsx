import { Flex, Text } from "@webstudio-is/design-system";
import { CreateProject } from "./project-dialogs";

export const EmptyState = () => (
  <Flex align="center" justify="center" direction="column" gap="6">
    <Text variant="brandMediumTitle" as="h1" align="center">
      What will you create?
    </Text>
    <CreateProject buttonText="Create First Project" />
  </Flex>
);
