import { forwardRef, useState, type ComponentProps } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  Flex,
  Grid,
  SmallIconButton,
  TextArea,
  rawTheme,
  theme,
} from "@webstudio-is/design-system";
import { CrossIcon, MaximizeIcon, MinimizeIcon } from "@webstudio-is/icons";

export const ExpandableTextField = forwardRef<
  HTMLTextAreaElement,
  ComponentProps<typeof TextArea> & { title: string }
>(({ title, ...props }, ref) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const width = isExpanded ? "80vw" : "640px";
  const height = isExpanded ? "80vh" : "480px";
  const padding = rawTheme.spacing[7];
  return (
    <Box
      css={{
        position: "relative",
        "&:hover": {
          "--ws-expandable-text-field-maximize-icon-visibility": "visible",
        },
      }}
    >
      <TextArea ref={ref} {...props} rows={1} maxRows={10} autoGrow={true} />
      <Dialog>
        <DialogTrigger asChild>
          <SmallIconButton
            icon={<MaximizeIcon />}
            css={{
              position: "absolute",
              top: 6,
              right: 4,
              visibility: `var(--ws-expandable-text-field-maximize-icon-visibility, hidden)`,
            }}
          />
        </DialogTrigger>
        <DialogContent
          // Left Aside panels (e.g., Pages, Components) use zIndex: theme.zIndices[1].
          // For a dialog to appear above these panels, both overlay and content should also have zIndex: theme.zIndices[1].
          css={{
            maxWidth: "none",
            maxHeight: "none",
            zIndex: theme.zIndices[1],
          }}
          overlayCss={{ zIndex: theme.zIndices[1] }}
        >
          <Grid
            align="stretch"
            css={{
              padding,
              width,
              height,
              overflow: "hidden",
              boxSizing: "content-box",
            }}
          >
            <TextArea ref={ref} {...props} grow={true} />
          </Grid>
          {/* Title is at the end intentionally,
           * to make the close button last in the tab order
           */}
          <DialogTitle
            suffix={
              <Flex gap="1">
                <Button
                  color="ghost"
                  prefix={isExpanded ? <MinimizeIcon /> : <MaximizeIcon />}
                  aria-label="Expand"
                  onClick={() => setIsExpanded(isExpanded ? false : true)}
                />
                <DialogClose asChild>
                  <Button
                    color="ghost"
                    prefix={<CrossIcon />}
                    aria-label="Close"
                  />
                </DialogClose>
              </Flex>
            }
          >
            {title}
          </DialogTitle>
        </DialogContent>
      </Dialog>
    </Box>
  );
});
ExpandableTextField.displayName = "ExpandableTextField";
