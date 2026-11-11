import { useEffect } from "react";
import { StorySection } from "@webstudio-is/design-system";
import {
  PublishValidationResults,
  type PublishValidationFinding,
} from "./publish-validation-results";

export default {
  title: "Publish/Validation results",
  component: PublishValidationResults,
};

const errorsAndWarnings: PublishValidationFinding[] = [
  {
    severity: "error",
    title: "Unable to complete publish validation",
    reportText: "ERROR: Unable to complete publish validation",
  },
  {
    severity: "warning",
    title:
      "Some project styles cannot be processed for publishing. Publishing can continue using base and font styles.",
    reportText:
      "Some project styles cannot be processed for publishing. Publishing can continue using base and font styles.",
  },
];

const ValidationStory = ({
  findings,
}: {
  findings: PublishValidationFinding[];
}) => {
  useEffect(() => {
    const open = () => {
      const button = Array.from(document.querySelectorAll("button")).find(
        (item) => item.textContent === "See issues"
      );
      if (button) {
        button.click();
        observer.disconnect();
      }
    };
    const observer = new MutationObserver(open);
    observer.observe(document.body, { childList: true, subtree: true });
    open();
    return () => observer.disconnect();
  }, []);

  return (
    <StorySection title="Publish validation">
      <PublishValidationResults findings={findings} />
    </StorySection>
  );
};

export const ErrorsAndWarnings = () => (
  <ValidationStory findings={errorsAndWarnings} />
);
export const WarningOnly = () => (
  <ValidationStory findings={[errorsAndWarnings[1]]} />
);
