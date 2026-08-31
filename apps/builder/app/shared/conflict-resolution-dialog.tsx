import type { ReactNode } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Flex,
  Text,
  theme,
} from "@webstudio-is/design-system";
import { DialogRadioOptions } from "./dialog-radio-options";

export const ConflictResolutionDialog = <Resolution extends string>({
  title,
  description,
  detailsLabel,
  details,
  resolution,
  options,
  onResolutionChange,
  onResolve,
  onCancel,
}: {
  title: string;
  description: string;
  detailsLabel: string;
  details: ReactNode;
  resolution: Resolution;
  options: ReadonlyArray<{
    value: Resolution;
    label: string;
    description: string;
  }>;
  onResolutionChange: (resolution: Resolution) => void;
  onResolve: () => void;
  onCancel: () => void;
}) => (
  <Dialog
    open={true}
    onOpenChange={(open) => {
      if (open === false) {
        onCancel();
      }
    }}
  >
    <DialogContent css={{ minWidth: "40ch" }}>
      <DialogTitle>{title}</DialogTitle>
      <Flex direction="column" gap="2" css={{ padding: theme.panel.padding }}>
        <DialogDescription asChild>
          <Text as="p">{description}</Text>
        </DialogDescription>
        <DialogRadioOptions
          value={resolution}
          options={options}
          onValueChange={onResolutionChange}
        />
        <Flex as="details" direction="column" gap="1">
          <Text as="summary">{detailsLabel}</Text>
          <Text color="subtle" css={{ maxHeight: 150, overflow: "auto" }}>
            {details}
          </Text>
        </Flex>
      </Flex>
      <DialogActions>
        <Button autoFocus color="primary" onClick={onResolve}>
          Continue
        </Button>
        <Button color="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </DialogActions>
    </DialogContent>
  </Dialog>
);
