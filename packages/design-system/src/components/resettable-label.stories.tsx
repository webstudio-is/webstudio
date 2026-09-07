import { useState } from "react";
import { ResettableLabel } from "./resettable-label";
import { TooltipProvider } from "./tooltip";
import { Grid } from "./grid";
import { InputField } from "./input-field";
import { Text } from "./text";
import { SectionTitleLabel } from "./section-title";
import { theme } from "../stitches.config";

export default { title: "Resettable label", component: ResettableLabel };

export const States = () => {
  const [value, setValue] = useState("An optional summary");
  return (
    <TooltipProvider>
      <Grid gap={4} css={{ width: 320, padding: theme.panel.padding }}>
        <ResettableLabel
          htmlFor="summary"
          color={value ? "local" : "default"}
          description="An optional summary for this entry."
          onReset={value ? () => setValue("") : undefined}
        >
          Summary
        </ResettableLabel>
        <InputField
          id="summary"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        {(["default", "preset", "local", "remote", "overwritten"] as const).map(
          (color) => (
            <ResettableLabel
              key={color}
              color={color}
              description="Color is chosen by the caller, independently of reset availability."
              onReset={
                color === "local" || color === "overwritten"
                  ? () => {}
                  : undefined
              }
            >
              {color}
            </ResettableLabel>
          )
        )}
        <ResettableLabel color="local" onReset={() => {}} resetDisabled>
          Read-only value
        </ResettableLabel>
        <ResettableLabel
          asChild
          color="overwritten"
          onReset={() => {}}
          content={
            <>
              <Text variant="titles">Typography</Text>
              <Text>Value comes from a local override.</Text>
            </>
          }
        >
          <SectionTitleLabel>Typography</SectionTitleLabel>
        </ResettableLabel>
      </Grid>
    </TooltipProvider>
  );
};
