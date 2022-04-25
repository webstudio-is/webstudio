import { useState } from "react";
import { type Project, type Breakpoint, sort } from "@webstudio-is/sdk";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuArrow,
  DropdownMenuSeparator,
  Button,
  Text,
  Paragraph,
  Box,
  Flex,
} from "~/shared/design-system";
import { type Publish } from "../../../shared/canvas-iframe";
import {
  useBreakpoints,
  useSelectedBreakpoint,
} from "../../../shared/nano-values";
import { BreakpointsEditor } from "./breakpoints-editor";

const Hint = ({ breakpoint }: { breakpoint?: Breakpoint }) => {
  return (
    <Box css={{ px: "$3" }}>
      <Paragraph css={{ fontSize: "$1" }}>CSS Preview:</Paragraph>
      <Paragraph css={{ fontSize: "$1" }} variant="gray">
        {breakpoint === undefined
          ? "No breakpoint selected"
          : `@media (min-width: ${breakpoint.minWidth}px)`}
      </Paragraph>
    </Box>
  );
};

const BreakpointSelectorItem = ({ breakpoint }: { breakpoint: Breakpoint }) => (
  <Flex align="center" justify="between" gap="3" css={{ flexGrow: 1 }}>
    <Text size="1">{breakpoint.label}</Text>
    <Text size="1" variant="gray">
      {breakpoint.minWidth}
    </Text>
  </Flex>
);

const menuItemCss = {
  display: "flex",
  gap: "$3",
  justifyContent: "start",
  flexGrow: 1,
  minWidth: 150,
};

type BreakpointsProps = {
  publish: Publish;
  project: Project;
};

export const Breakpoints = ({ publish, project }: BreakpointsProps) => {
  const [breakpoints, setBreakpoints] = useBreakpoints();
  const [selectedBreakpoint, setSelectedBreakpoint] = useSelectedBreakpoint();
  const [isEditing, setIsEditing] = useState(false);
  const [breakpointHint, setBreakpointHint] = useState(selectedBreakpoint);

  if (selectedBreakpoint === undefined) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button css={{ gap: "$1" }} ghost aria-label="Breakpoints">
          <Text size="1">{selectedBreakpoint.label}</Text>
          {selectedBreakpoint.minWidth > 0 && (
            <Text size="1" variant="gray">
              {selectedBreakpoint.minWidth}
            </Text>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {isEditing ? (
          <BreakpointsEditor
            breakpoints={breakpoints}
            onSelect={setBreakpointHint}
            publish={publish}
            project={project}
          />
        ) : (
          breakpoints.map((breakpoint, index) => {
            return (
              <DropdownMenuItem
                key={index}
                css={menuItemCss}
                onMouseOver={() => {
                  setBreakpointHint(breakpoint);
                }}
                onMouseOut={() => {
                  setBreakpointHint(selectedBreakpoint);
                }}
                onSelect={() => {
                  publish({
                    type: "selectBreakpoint",
                    payload: breakpoint,
                  });
                  setSelectedBreakpoint(breakpoint);
                }}
              >
                <BreakpointSelectorItem breakpoint={breakpoint} />
              </DropdownMenuItem>
            );
          })
        )}
        <DropdownMenuSeparator />
        <Hint breakpoint={breakpointHint} />
        <DropdownMenuSeparator />
        <DropdownMenuItem
          css={{ justifyContent: "center" }}
          onSelect={(event) => {
            event.preventDefault();
            setIsEditing(!isEditing);
            setBreakpoints(sort(breakpoints));
          }}
        >
          {isEditing ? "Done" : "Edit"}
        </DropdownMenuItem>
        <DropdownMenuArrow offset={10} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
