import { type Breakpoint } from "@webstudio-is/react-sdk";
import { Button, Flex, TextLegacy } from "@webstudio-is/design-system";

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
      <TextLegacy size="2" css={{ lineHeight: 1.5 }}>
        {`Are you sure you want to delete "${breakpoint.label}"?`}
      </TextLegacy>
      <TextLegacy size="2" css={{ lineHeight: 1.5 }}>
        {`Deleting a breakpoint will also delete all styles associated with this
        breakpoint.`}
      </TextLegacy>
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
