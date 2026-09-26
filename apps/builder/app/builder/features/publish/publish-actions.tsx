import { useCallback, useEffect, useRef, useState, type Ref } from "react";
import { Button, Flex, Tooltip } from "@webstudio-is/design-system";
import { CheckCircleIcon } from "@webstudio-is/icons";

export type PublishValidationState = "idle" | "passed";

export const usePublishValidationState = (isOpen: boolean) => {
  const [validationState, setValidationState] =
    useState<PublishValidationState>("idle");
  const session = useRef(0);
  const sessionAtRender = session.current;
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;

  const reset = useCallback(() => {
    session.current += 1;
    setValidationState("idle");
  }, []);

  const update = useCallback(
    (state: PublishValidationState) => {
      if (isOpenRef.current && session.current === sessionAtRender) {
        setValidationState(state);
      }
    },
    [sessionAtRender]
  );

  useEffect(() => {
    if (isOpen === false) {
      reset();
    }
  }, [isOpen, reset]);

  return { validationState, update, reset };
};

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
