import { type Breakpoint } from "@webstudio-is/react-sdk";
import { Button, Flex, __DEPRECATED__Text } from "@webstudio-is/design-system";

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
    <Flex gap="2" direction="column" css={{ px: "$5", py: "$2", width: 300 }}>
      <__DEPRECATED__Text size="2" css={{ lineHeight: 1.5 }}>
        {`Are you sure you want to delete "${breakpoint.label}"?`}
      </__DEPRECATED__Text>
      <__DEPRECATED__Text size="2" css={{ lineHeight: 1.5 }}>
        {`Deleting a breakpoint will also delete all styles associated with this
        breakpoint.`}
      </__DEPRECATED__Text>
      <Flex justify="end" gap="2">
        <Button
          onClick={() => {
            onConfirm();
          }}
        >
          Delete
        </Button>
        <Button
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
