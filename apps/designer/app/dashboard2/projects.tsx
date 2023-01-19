import { Button, Flex } from "@webstudio-is/design-system";
import { EmptyState } from "./empty-state";
import { Panel } from "./panel";
import { Heading } from "./heading";
import { PlusIcon } from "@webstudio-is/icons";

export const Projects = () => {
  return (
    <Panel>
      <Flex direction="column" gap="3">
        <Flex justify="between">
          <Heading variant="small">Projects</Heading>
          <Button prefix={<PlusIcon />}>New Project</Button>
        </Flex>
        <EmptyState />
      </Flex>
    </Panel>
  );
};
