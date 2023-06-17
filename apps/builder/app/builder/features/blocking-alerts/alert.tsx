import { css, Flex, Text, theme } from "@webstudio-is/design-system";
import { AlertIcon } from "@webstudio-is/icons";

const containerStyle = css({
  position: "absolute",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  zIndex: theme.zIndices.max,
  background: "rgba(0, 0, 0, 0.9)",
});

const contentStyle = css({
  width: theme.spacing[33],
  color: theme.colors.foregroundDestructive,
});

export const Alert = ({ message }: { message: string }) => {
  return (
    <Flex align="center" justify="center" className={containerStyle()}>
      <Flex
        direction="column"
        align="center"
        gap="2"
        className={contentStyle()}
      >
        <AlertIcon size={22} />
        <Text color="contrast" variant="labelsSentenceCase" align="center">
          {message}
        </Text>
      </Flex>
    </Flex>
  );
};
