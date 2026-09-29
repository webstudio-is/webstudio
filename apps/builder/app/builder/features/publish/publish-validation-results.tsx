import { useState, type ReactNode } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogClose,
  DialogContent,
  DialogTitle,
  Flex,
  PanelBanner,
  PanelContent,
  Separator,
  ScrollArea,
  Text,
} from "@webstudio-is/design-system";

export type PublishValidationFinding = {
  severity: "error" | "warning";
  title: ReactNode;
  details?: ReactNode;
};

export const PublishValidationResults = ({
  findings,
}: {
  findings: PublishValidationFinding[];
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const errors = findings.filter(({ severity }) => severity === "error");
  const warnings = findings.filter(({ severity }) => severity === "warning");

  if (findings.length === 0) {
    return null;
  }

  const countLabel = [
    errors.length > 0 &&
      `${errors.length} ${errors.length === 1 ? "error" : "errors"}`,
    warnings.length > 0 &&
      `${warnings.length} ${warnings.length === 1 ? "warning" : "warnings"}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <PanelBanner variant={errors.length > 0 ? "error" : "warning"}>
        <Flex align="center" justify="between" gap={2}>
          <Text css={{ flex: 1, minWidth: 0 }}>
            Publish check found {countLabel}.{" "}
            {errors.length > 0 && "Fix the errors before publishing."}
          </Text>
          <Button
            type="button"
            color="ghost"
            css={{ flexShrink: 0 }}
            onClick={() => setIsOpen(true)}
          >
            See issues
          </Button>
        </Flex>
      </PanelBanner>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          width={640}
          height={640}
          css={{ display: "flex", flexDirection: "column" }}
        >
          <DialogTitle>Publish check details</DialogTitle>
          <ScrollArea css={{ flex: 1, minHeight: 0 }}>
            <PanelContent as={Flex} direction="column" gap={4}>
              {errors.length > 0 && (
                <FindingGroup title="Errors" findings={errors} />
              )}
              {warnings.length > 0 && (
                <FindingGroup title="Warnings" findings={warnings} />
              )}
            </PanelContent>
          </ScrollArea>
          <DialogActions>
            <DialogClose>
              <Button type="button" color="ghost">
                Close
              </Button>
            </DialogClose>
          </DialogActions>
        </DialogContent>
      </Dialog>
    </>
  );
};

const FindingGroup = ({
  title,
  findings,
}: {
  title: string;
  findings: PublishValidationFinding[];
}) => (
  <Flex direction="column" gap={3}>
    <Text variant="labels">
      {title} ({findings.length})
    </Text>
    <Flex direction="column" gap={3}>
      {findings.map((finding, index) => (
        <Flex key={`${title}-${index}`} direction="column" gap={1}>
          <Text variant="labels">{finding.title}</Text>
          {finding.details !== undefined && (
            <Text color="subtle">{finding.details}</Text>
          )}
          {index < findings.length - 1 && <Separator />}
        </Flex>
      ))}
    </Flex>
  </Flex>
);
