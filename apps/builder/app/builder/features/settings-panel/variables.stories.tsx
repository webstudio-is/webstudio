import type { Meta, StoryObj } from "@storybook/react";
import { CodeEditor as CodeEditorComponent } from "./code-editor";
import {
  Button,
  FloatingPanelPopover,
  FloatingPanelPopoverContent,
  FloatingPanelPopoverTrigger,
} from "@webstudio-is/design-system";
import { VariablesPanel } from "./variables";
import { selectedInstanceSelectorStore } from "~/shared/nano-states";
import { registerContainers } from "~/shared/sync";
import { useState } from "react";

export default {
  title: "Builder/Variables",
  component: CodeEditorComponent,
} satisfies Meta;

registerContainers();
selectedInstanceSelectorStore.set(["root"]);

export const Variables: StoryObj = {
  render: () => {
    const [isOpen, setIsOpen] = useState(true);
    return (
      <FloatingPanelPopover open={isOpen} onOpenChange={setIsOpen}>
        <FloatingPanelPopoverTrigger asChild>
          <Button>Open variables panel</Button>
        </FloatingPanelPopoverTrigger>
        <FloatingPanelPopoverContent align="start">
          <VariablesPanel propId={undefined} />
        </FloatingPanelPopoverContent>
      </FloatingPanelPopover>
    );
  },
};
