import { useState, type Ref } from "react";
import { Button, Flex, Tooltip } from "@webstudio-is/design-system";
import { CheckCircleIcon } from "@webstudio-is/icons";

export type PublishValidationState = "idle" | "passed";

export const PublishActions = ({
  validationState,
  validateDisabled,
  publishDisabled,
  publishInProgress,
  publishPending,
  hasSelectedDomains,
  publishLabel,
  publishButtonRef,
  onValidate,
  onPublish,
}: {
  validationState: PublishValidationState;
  validateDisabled: boolean;
  publishDisabled: boolean;
  publishInProgress: boolean;
  publishPending: boolean;
  hasSelectedDomains: boolean;
  publishLabel: string;
  publishButtonRef: Ref<HTMLButtonElement>;
  onValidate: () => Promise<void>;
  onPublish: () => void;
}) => {
  const [isValidating, setIsValidating] = useState(false);

  const handleValidate = async () => {
    setIsValidating(true);
    try {
      await onValidate();
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <Flex gap={2}>
      <Button
        type="button"
        color="positive"
        state={isValidating ? "pending" : undefined}
        disabled={validateDisabled}
        css={{ flex: 1 }}
        prefix={validationState === "passed" ? <CheckCircleIcon /> : undefined}
        onClick={handleValidate}
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
          disabled={publishInProgress || publishDisabled || isValidating}
        >
          {publishLabel}
        </Button>
      </Tooltip>
    </Flex>
  );
};
