import {
  Flex,
  DeprecatedIconButton,
  Text,
  Tooltip,
} from "@webstudio-is/design-system";
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
        css={{ height: 40, paddingLeft: "$spacing$9", flexShrink: 0 }}
        align="center"
        justify="between"
      >
        <Text variant="title">{title}</Text>
        {suffix && <Flex css={{ marginRight: "$spacing$5" }}>{suffix}</Flex>}
      </Flex>
      <Separator css={{ height: 2 }} />
    </>
  );
};

export const CloseButton = ({ onClick }: { onClick: () => void }) => (
  <Tooltip content="Close panel" side="bottom">
    <DeprecatedIconButton onClick={onClick} size="2" aria-label="Close panel">
      <CrossIcon />
    </DeprecatedIconButton>
  </Tooltip>
);
