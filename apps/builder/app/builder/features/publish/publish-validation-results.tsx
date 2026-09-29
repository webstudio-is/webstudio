import { Fragment, useState, type ReactNode } from "react";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTitleActions,
  Flex,
  IconButton,
  PanelBanner,
  PanelContent,
  PanelTabs,
  PanelTabsContent,
  PanelTabsList,
  PanelTabsTrigger,
  ScrollArea,
  Separator,
  Text,
} from "@webstudio-is/design-system";
import { CopyIcon } from "@webstudio-is/icons";
import { CopyToClipboard } from "~/shared/copy-to-clipboard";

export type PublishValidationFinding = {
  severity: "error" | "warning";
  title: ReactNode;
  details?: ReactNode;
  link?: ReactNode;
  relatedInstanceId?: string;
  reportText: string;
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
  const defaultTab = errors.length > 0 ? "errors" : "warnings";
  const reportText = [
    `Publish validation report: ${countLabel}`,
    errors.length > 0 &&
      [
        `Errors (${errors.length})`,
        ...errors.map(({ reportText }) => reportText),
      ].join("\n\n"),
    warnings.length > 0 &&
      [
        `Warnings (${warnings.length})`,
        ...warnings.map(({ reportText }) => reportText),
      ].join("\n\n"),
  ]
    .filter(Boolean)
    .join("\n\n");

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
          <DialogTitle
            suffix={
              <DialogTitleActions>
                <CopyToClipboard text={reportText} copyText="Copy all reports">
                  <IconButton
                    type="button"
                    aria-label="Copy all reports"
                    onPointerDown={(event) => event.stopPropagation()}
                  >
                    <CopyIcon aria-hidden />
                  </IconButton>
                </CopyToClipboard>
                <DialogClose />
              </DialogTitleActions>
            }
          >
            Publish check report
          </DialogTitle>
          <PanelTabs
            key={`${errors.length}-${warnings.length}`}
            defaultValue={defaultTab}
            css={{ flex: 1, minHeight: 0, overflow: "hidden" }}
          >
            <PanelTabsList aria-label="Publish check severity">
              {errors.length > 0 && (
                <PanelTabsTrigger value="errors">
                  Errors ({errors.length})
                </PanelTabsTrigger>
              )}
              {warnings.length > 0 && (
                <PanelTabsTrigger value="warnings">
                  Warnings ({warnings.length})
                </PanelTabsTrigger>
              )}
            </PanelTabsList>
            {errors.length > 0 && (
              <PanelTabsContent
                value="errors"
                css={{ flex: 1, minHeight: 0, overflow: "hidden" }}
              >
                <FindingList findings={errors} />
              </PanelTabsContent>
            )}
            {warnings.length > 0 && (
              <PanelTabsContent
                value="warnings"
                css={{ flex: 1, minHeight: 0, overflow: "hidden" }}
              >
                <FindingList findings={warnings} />
              </PanelTabsContent>
            )}
          </PanelTabs>
        </DialogContent>
      </Dialog>
    </>
  );
};

const FindingList = ({
  findings,
}: {
  findings: PublishValidationFinding[];
}) => (
  <ScrollArea css={{ height: "100%" }}>
    <PanelContent as={Flex} direction="column" gap={3}>
      {findings.map((finding, index) => (
        <Fragment key={`${finding.severity}-${index}`}>
          <Flex direction="column" gap={2}>
            <Text variant="labels" userSelect="text">
              {finding.title} {finding.link}
            </Text>
            {finding.details !== undefined && (
              <Text userSelect="text" color="subtle">
                {finding.details}
              </Text>
            )}
          </Flex>
          {index < findings.length - 1 && <Separator />}
        </Fragment>
      ))}
    </PanelContent>
  </ScrollArea>
);
