import { useEffect, useRef, useState } from "react";
import {
  Box,
  InputField,
  StorySection,
  theme,
} from "@webstudio-is/design-system";
import { validatePrimitiveValue } from "@webstudio-is/project-build/runtime";
import { $builderMode } from "~/shared/nano-states";
import {
  BindingControl,
  BindingPopover,
  type BindingVariant,
} from "./binding-popover";

export default {
  title: "Builder/Binding popover",
  component: BindingPopover,
};

const BindingStory = ({
  variant,
  value,
  error = false,
  removable = true,
}: {
  variant: BindingVariant;
  value?: string;
  error?: boolean;
  removable?: boolean;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const previousMode = $builderMode.get();
    $builderMode.set("design");
    setReady(true);
    return () => $builderMode.set(previousMode);
  }, []);

  useEffect(() => {
    if (ready) {
      containerRef.current
        ?.querySelector<HTMLButtonElement>("button[data-variant]")
        ?.click();
    }
  }, [ready]);

  return (
    <StorySection title="Binding">
      <Box
        ref={containerRef}
        data-floating-panel-container
        css={{
          width: theme.sizes.sidebarWidth,
          height: 720,
          marginLeft: 360,
          marginTop: 100,
        }}
      >
        <BindingControl>
          <InputField aria-label="Value" value="Example" readOnly />
          <BindingPopover
            scope={{ title: "Example" }}
            aliases={new Map([["title", "title"]])}
            variant={variant}
            value={value}
            validate={
              error
                ? (value) => validatePrimitiveValue(value, "Value")
                : undefined
            }
            onChange={() => {}}
            onRemove={removable ? () => {} : undefined}
          />
        </BindingControl>
      </Box>
    </StorySection>
  );
};

export const Default = () => <BindingStory variant="default" />;
export const Bound = () => <BindingStory variant="bound" value="title" />;
export const Error = () => <BindingStory variant="bound" value="({})" error />;
export const ResetDisabled = () => (
  <BindingStory variant="bound" value="title" removable={false} />
);
