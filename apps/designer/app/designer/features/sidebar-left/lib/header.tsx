import { Flex, IconButton, Text } from "@webstudio-is/design-system";
import { Separator } from "@webstudio-is/design-system";
import { CrossIcon } from "@webstudio-is/icons";

type HeaderProps = {
  title: string;
  suffix: React.ReactNode;
};

export const Header = ({ title, suffix }: HeaderProps) => {
  return (
    <>
      <Flex
        css={{ height: 40, paddingLeft: "$3", flexShrink: 0 }}
        align="center"
        justify="between"
      >
        <Text variant="title">{title}</Text>
        {suffix && <Flex css={{ marginRight: "$1" }}>{suffix}</Flex>}
      </Flex>
      <Separator css={{ height: 2 }} />
    </>
  );
};

export const CloseButton = ({ onClick }: { onClick: () => void }) => (
  <IconButton onClick={onClick} size="2" aria-label="Close">
    <CrossIcon />
  </IconButton>
);
