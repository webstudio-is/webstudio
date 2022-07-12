import { ImageIcon } from "~/shared/icons";
import { Button, Flex, Heading } from "~/shared/design-system";

export const TabContent = () => {
  return (
    <Flex gap="3" direction="column" css={{ padding: "$1" }}>
      <Heading>Assets</Heading>
      <Flex>
        <Button>Upload Image</Button>
      </Flex>
    </Flex>
  );
};

export const icon = <ImageIcon />;
