import type { Breakpoint } from "@webstudio-is/css-data";
import { Button, Flex, DeprecatedParagraph } from "@webstudio-is/design-system";
import { theme } from "@webstudio-is/design-system";

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
      <DeprecatedParagraph>{`Are you sure you want to delete "${breakpoint.label}"?`}</DeprecatedParagraph>
      <DeprecatedParagraph>
        {`Deleting a breakpoint will also delete all styles associated with this
        breakpoint.`}
      </DeprecatedParagraph>
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
