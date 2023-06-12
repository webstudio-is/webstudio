import type { Breakpoint } from "@webstudio-is/project-build";
import { theme, Button, Flex, Text } from "@webstudio-is/design-system";

type ConfirmationDialogProps = {
  onAbort: () => void;
  onConfirm: () => void;
  breakpoint: Breakpoint;
};

export const ConfirmationDialog = ({
  breakpoint,
  onConfirm,
  onAbort,
}: ConfirmationDialogProps) => {
  return (
    <Flex
      gap="2"
      direction="column"
      css={{ px: theme.spacing[11], py: theme.spacing[5], width: 300 }}
    >
      <Text>{`Are you sure you want to delete "${breakpoint.label}"?`}</Text>
      <Text>
        {`Deleting a breakpoint will also delete all styles associated with this
        breakpoint.`}
      </Text>
      <Flex justify="end" gap="2">
        <Button
          onClick={() => {
            onConfirm();
          }}
        >
          Delete
        </Button>
        <Button
          color="neutral"
          autoFocus
          onClick={() => {
            onAbort();
          }}
        >
          Abort
        </Button>
      </Flex>
    </Flex>
  );
};
