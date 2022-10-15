import { Flex, IconButton, Text } from "@webstudio-is/design-system";
import { Separator } from "@webstudio-is/design-system";
import { Cross1Icon } from "@webstudio-is/icons";

type BaseHeaderProps = {
  title: string;
  actions: React.ReactNode;
};

export const BaseHeader = ({ title, actions }: BaseHeaderProps) => {
  return (
    <>
      <Flex
        css={{ height: 40, paddingLeft: "$3", flexShrink: 0 }}
        align="center"
        justify="between"
      >
        <Text variant="title">{title}</Text>
        {actions && <Flex css={{ marginRight: "$1" }}>{actions}</Flex>}
      </Flex>
      <Separator css={{ height: 2 }} />
    </>
  );
};

type HeaderProps = {
  title: string;
  isClosable?: boolean;
  onClose?: () => void;
};

export const Header = ({ title, isClosable = true, onClose }: HeaderProps) => {
  return (
    <BaseHeader
      title={title}
      actions={
        isClosable ? (
          <IconButton onClick={() => onClose?.()} size="2" aria-label="Close">
            <Cross1Icon />
          </IconButton>
        ) : null
      }
    />
  );
};
