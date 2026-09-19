import type { Ref } from "react";
import { Button, Flex, Tooltip } from "@webstudio-is/design-system";
import { CheckCircleIcon } from "@webstudio-is/icons";

export type PublishValidationState = "idle" | "pending" | "passed";

export const PublishActions = ({
  validationState,
  validateDisabled,
  publishDisabled,
  publishPending,
  publishInProgress,
  hasSelectedDomains,
  publishLabel,
  publishButtonRef,
  onValidate,
  onPublish,
}: {
  validationState: PublishValidationState;
  validateDisabled: boolean;
  publishDisabled: boolean;
  publishPending: boolean;
  publishInProgress: boolean;
  hasSelectedDomains: boolean;
  publishLabel: string;
  publishButtonRef: Ref<HTMLButtonElement>;
  onValidate: () => void;
  onPublish: () => void;
}) => {
  const isValidating = validationState === "pending";

  return (
    <Flex gap={2}>
      <Button
        type="button"
        color="positive"
        state={isValidating ? "pending" : undefined}
        disabled={validateDisabled}
        css={{ flex: 1 }}
        prefix={validationState === "passed" ? <CheckCircleIcon /> : undefined}
        onClick={onValidate}
      >
        {validationState === "passed" ? "Validated" : "Validate"}
      </Button>
      <Tooltip
        content={
          publishInProgress
            ? "Publish process in progress"
            : hasSelectedDomains
              ? undefined
              : "Select at least one domain to publish"
        }
      >
        <Button
          ref={publishButtonRef}
          type="button"
          onClick={onPublish}
          color="primary"
          state={publishPending ? "pending" : undefined}
          css={{ flex: 1 }}
          disabled={publishDisabled || isValidating}
        >
          {publishLabel}
        </Button>
      </Tooltip>
    </Flex>
  );
};
