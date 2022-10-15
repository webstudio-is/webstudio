import { type Breakpoint } from "@webstudio-is/react-sdk";
import { Button, Flex, Paragraph } from "@webstudio-is/design-system";

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
      <Paragraph>{`Are you sure you want to delete "${breakpoint.label}"?`}</Paragraph>
      <Paragraph>
        {`Deleting a breakpoint will also delete all styles associated with this
        breakpoint.`}
      </Paragraph>
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
