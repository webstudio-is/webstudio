import { useRef, useState, type DragEvent, type ChangeEvent } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogClose,
  DialogContent,
  DialogTitle,
  Flex,
  Grid,
  Label,
  Radio,
  RadioAndLabel,
  RadioGroup,
  ScrollArea,
  Text,
  TextArea,
  theme,
  toast,
} from "@webstudio-is/design-system";
import { UploadIcon } from "@webstudio-is/icons";
import type { PageRedirect } from "@webstudio-is/sdk";
import {
  parseRedirects,
  type ParsedRedirect,
  type SkippedLine,
} from "~/shared/redirects/redirect-parsers";
import { detectLoopsInBatch } from "~/shared/redirects/redirect-loop-detection";

type ImportStep = "input" | "preview";
type MergeMode = "add" | "replace";

type ImportRedirectsDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  existingRedirects: PageRedirect[];
  onImport: (redirects: PageRedirect[], mode: MergeMode) => void;
};

const ACCEPTED_EXTENSIONS = [".csv", ".json", ".txt", ".htaccess"];

const formatSupportsText = `Supports: CSV, JSON, Netlify _redirects, Apache .htaccess`;

export const ImportRedirectsDialog = ({
  isOpen,
  onOpenChange,
  existingRedirects,
  onImport,
}: ImportRedirectsDialogProps) => {
  const [step, setStep] = useState<ImportStep>("input");
  const [textContent, setTextContent] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [parsedRedirects, setParsedRedirects] = useState<ParsedRedirect[]>([]);
  const [skippedLines, setSkippedLines] = useState<SkippedLine[]>([]);
  const [mergeMode, setMergeMode] = useState<MergeMode>("add");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setStep("input");
    setTextContent("");
    setFileName(null);
    setParsedRedirects([]);
    setSkippedLines([]);
    setMergeMode("add");
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetState();
    }
    onOpenChange(open);
  };

  const handleFileRead = (content: string, name: string) => {
    setTextContent(content);
    setFileName(name);
  };

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        handleFileRead(content, file.name);
      };
      reader.readAsText(file);
    }
    // Reset input so same file can be selected again
    event.target.value = "";
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);

    const file = event.dataTransfer.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        handleFileRead(content, file.name);
      };
      reader.readAsText(file);
    }
  };

  const handleParse = () => {
    if (!textContent.trim()) {
      toast.error("Please upload a file or paste redirect content");
      return;
    }

    const result = parseRedirects(textContent);
    setParsedRedirects(result.redirects);
    setSkippedLines(result.skipped);

    if (result.redirects.length === 0 && result.skipped.length === 0) {
      toast.error("No redirects found in the provided content");
      return;
    }

    if (result.redirects.length === 0) {
      toast.error(
        `No valid redirects found. ${result.skipped.length} line(s) were skipped.`
      );
      return;
    }

    setStep("preview");
  };

  const handleImport = () => {
    // Convert parsed redirects to PageRedirect format
    const newRedirects: PageRedirect[] = parsedRedirects.map((r) => ({
      old: r.old,
      new: r.new,
      status: r.status === 301 ? "301" : "302",
    }));

    // Find duplicates with existing redirects
    const existingPaths = new Set(existingRedirects.map((r) => r.old));
    const duplicates = newRedirects.filter((r) => existingPaths.has(r.old));
    const uniqueNew = newRedirects.filter((r) => !existingPaths.has(r.old));

    if (mergeMode === "add") {
      // Detect loops with existing redirects
      const { valid, looped } = detectLoopsInBatch(
        uniqueNew,
        existingRedirects
      );
      const loopCount = looped.length;

      onImport(valid, "add");
      const skippedParts = [
        duplicates.length > 0 &&
          `${duplicates.length} duplicate${duplicates.length !== 1 ? "s" : ""}`,
        loopCount > 0 && `${loopCount} loop${loopCount !== 1 ? "s" : ""}`,
      ].filter(Boolean);
      const skippedMessage =
        skippedParts.length > 0 ? ` (${skippedParts.join(", ")} skipped)` : "";
      toast.success(
        `Imported ${valid.length} redirect${valid.length !== 1 ? "s" : ""}${skippedMessage}`
      );
    } else {
      // Replace all - detect loops within the new set
      const { valid, looped } = detectLoopsInBatch(newRedirects, []);
      const loopCount = looped.length;

      onImport(valid, "replace");
      const skippedMessage =
        loopCount > 0
          ? ` (${loopCount} loop${loopCount !== 1 ? "s" : ""} skipped)`
          : "";
      toast.success(
        `Replaced all redirects with ${valid.length} new redirect${valid.length !== 1 ? "s" : ""}${skippedMessage}`
      );
    }

    handleOpenChange(false);
  };

  // Count duplicates for display
  const existingPaths = new Set(existingRedirects.map((r) => r.old));
  const duplicateRedirects = parsedRedirects.filter((r) =>
    existingPaths.has(r.old)
  );
  const duplicateCount = duplicateRedirects.length;
  const uniqueCount = parsedRedirects.length - duplicateCount;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent css={{ width: 520, maxHeight: "80vh" }}>
        <ScrollArea>
          <Flex
            direction="column"
            css={{
              padding: theme.panel.padding,
            }}
            gap="3"
          >
            {step === "input" && (
              <InputStep
                textContent={textContent}
                fileName={fileName}
                isDragOver={isDragOver}
                fileInputRef={fileInputRef}
                onTextChange={setTextContent}
                onFileSelect={handleFileSelect}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onUploadClick={() => fileInputRef.current?.click()}
              />
            )}

            {step === "preview" && (
              <PreviewStep
                parsedRedirects={parsedRedirects}
                skippedLines={skippedLines}
                duplicateRedirects={duplicateRedirects}
                duplicateCount={duplicateCount}
                uniqueCount={uniqueCount}
                mergeMode={mergeMode}
                existingRedirectsCount={existingRedirects.length}
                onMergeModeChange={setMergeMode}
              />
            )}
          </Flex>
        </ScrollArea>

        <DialogActions>
          {step === "input" && (
            <>
              <Button onClick={handleParse} disabled={!textContent.trim()}>
                Parse
              </Button>
              <DialogClose>
                <Button color="ghost">Cancel</Button>
              </DialogClose>
            </>
          )}

          {step === "preview" && (
            <>
              <Button
                onClick={handleImport}
                disabled={parsedRedirects.length === 0}
              >
                Import
              </Button>
              <DialogClose>
                <Button color="ghost">Cancel</Button>
              </DialogClose>
            </>
          )}
        </DialogActions>

        <DialogTitle>Import redirects</DialogTitle>
      </DialogContent>
    </Dialog>
  );
};

// Input Step Component
const InputStep = ({
  textContent,
  fileName,
  isDragOver,
  fileInputRef,
  onTextChange,
  onFileSelect,
  onDragOver,
  onDragLeave,
  onDrop,
  onUploadClick,
}: {
  textContent: string;
  fileName: string | null;
  isDragOver: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onTextChange: (value: string) => void;
  onFileSelect: (event: ChangeEvent<HTMLInputElement>) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDragLeave: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onUploadClick: () => void;
}) => {
  return (
    <>
      <Text color="subtle">{formatSupportsText}</Text>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS.join(",")}
        onChange={onFileSelect}
        style={{ display: "none" }}
      />

      {/* Drop zone */}
      <Box
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        css={{
          border: `2px dashed ${isDragOver ? theme.colors.borderFocus : theme.colors.borderMain}`,
          borderRadius: theme.borderRadius[6],
          padding: theme.spacing[9],
          textAlign: "center",
          backgroundColor: isDragOver
            ? theme.colors.backgroundHover
            : "transparent",
          transition: "all 0.2s ease",
          cursor: "pointer",
        }}
        onClick={onUploadClick}
      >
        <Flex direction="column" align="center" gap="2">
          <UploadIcon size={24} />
          <Text>{fileName ? fileName : "Upload file or drag & drop"}</Text>
          <Text color="subtle">{ACCEPTED_EXTENSIONS.join(", ")}</Text>
        </Flex>
      </Box>

      <Flex align="center" gap="2">
        <Box
          css={{ flex: 1, height: 1, backgroundColor: theme.colors.borderMain }}
        />
        <Text color="subtle">OR</Text>
        <Box
          css={{ flex: 1, height: 1, backgroundColor: theme.colors.borderMain }}
        />
      </Flex>

      <Grid gap="1">
        <Label>Paste content</Label>
        <TextArea
          rows={6}
          maxRows={10}
          autoGrow
          value={textContent}
          onChange={onTextChange}
          placeholder={`/old-path,/new-path,301\n/about-us,/about,301`}
        />
      </Grid>
    </>
  );
};

// Preview Step Component
const PreviewStep = ({
  parsedRedirects,
  skippedLines,
  duplicateRedirects,
  duplicateCount,
  uniqueCount,
  mergeMode,
  existingRedirectsCount,
  onMergeModeChange,
}: {
  parsedRedirects: ParsedRedirect[];
  skippedLines: SkippedLine[];
  duplicateRedirects: ParsedRedirect[];
  duplicateCount: number;
  uniqueCount: number;
  mergeMode: MergeMode;
  existingRedirectsCount: number;
  onMergeModeChange: (mode: MergeMode) => void;
}) => {
  return (
    <>
      {/* Preview list */}
      <Grid gap="1">
        <Label>Preview ({parsedRedirects.length})</Label>

        <ScrollArea
          css={{
            border: `1px solid ${theme.colors.borderMain}`,
            borderRadius: theme.borderRadius[4],
            maxHeight: 200,
            overflow: "auto",
          }}
        >
          <Flex direction="column" css={{ padding: theme.spacing[3] }}>
            {parsedRedirects.map((redirect, index) => (
              <Flex
                key={index}
                gap="2"
                align="center"
                css={{
                  paddingBlock: theme.spacing[1],
                }}
              >
                <Text
                  truncate
                  css={{
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  {redirect.old}
                </Text>
                <Text color="subtle" css={{ flexShrink: 0 }}>
                  {redirect.status}
                </Text>
                <Text color="subtle" css={{ flexShrink: 0 }}>
                  →
                </Text>
                <Text
                  truncate
                  css={{
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  {redirect.new}
                </Text>
              </Flex>
            ))}
          </Flex>
        </ScrollArea>
      </Grid>

      {/* Unsupported lines */}
      {skippedLines.length > 0 && (
        <Grid gap="1">
          <Label>Unsupported ({skippedLines.length})</Label>
          <ScrollArea
            css={{
              border: `1px solid ${theme.colors.borderMain}`,
              borderRadius: theme.borderRadius[4],
              maxHeight: 120,
              overflow: "auto",
            }}
          >
            <Flex direction="column" css={{ padding: theme.spacing[3] }}>
              {skippedLines.map((skipped, index) => (
                <Flex
                  key={index}
                  direction="column"
                  css={{ paddingBlock: theme.spacing[1] }}
                >
                  <Text color="subtle">
                    Line {skipped.line}: {skipped.reason}
                  </Text>
                  <Text truncate>{skipped.content}</Text>
                </Flex>
              ))}
            </Flex>
          </ScrollArea>
        </Grid>
      )}

      {/* Duplicates */}
      {duplicateRedirects.length > 0 && (
        <Grid gap="1">
          <Label>Duplicates ({duplicateRedirects.length})</Label>
          <ScrollArea
            css={{
              border: `1px solid ${theme.colors.borderMain}`,
              borderRadius: theme.borderRadius[4],
              maxHeight: 120,
              overflow: "auto",
            }}
          >
            <Flex direction="column" css={{ padding: theme.spacing[3] }}>
              {duplicateRedirects.map((redirect, index) => (
                <Flex
                  key={index}
                  gap="2"
                  align="center"
                  css={{
                    paddingBlock: theme.spacing[1],
                  }}
                >
                  <Text
                    truncate
                    css={{
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    {redirect.old}
                  </Text>
                  <Text color="subtle" css={{ flexShrink: 0 }}>
                    {redirect.status}
                  </Text>
                  <Text color="subtle" css={{ flexShrink: 0 }}>
                    →
                  </Text>
                  <Text
                    truncate
                    css={{
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    {redirect.new}
                  </Text>
                </Flex>
              ))}
            </Flex>
          </ScrollArea>
        </Grid>
      )}

      {/* Merge options */}
      {existingRedirectsCount > 0 && (
        <Grid gap="2">
          <Label>Import mode</Label>
          <RadioGroup
            value={mergeMode}
            onValueChange={(value) => onMergeModeChange(value as MergeMode)}
          >
            <Flex direction="column" gap="2">
              <RadioAndLabel>
                <Radio value="add" id="import-mode-add" />
                <Label htmlFor="import-mode-add">
                  Add to existing ({uniqueCount} new
                  {duplicateCount > 0
                    ? `, ${duplicateCount} duplicate${duplicateCount !== 1 ? "s" : ""} skipped`
                    : ""}
                  )
                </Label>
              </RadioAndLabel>
              <RadioAndLabel>
                <Radio value="replace" id="import-mode-replace" />
                <Label htmlFor="import-mode-replace">
                  Replace all ({parsedRedirects.length} total, removes{" "}
                  {existingRedirectsCount} existing)
                </Label>
              </RadioAndLabel>
            </Flex>
          </RadioGroup>
        </Grid>
      )}
    </>
  );
};
