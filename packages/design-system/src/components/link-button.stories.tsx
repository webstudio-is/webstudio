import type { ComponentProps } from "react";
import { ExternalLinkIcon } from "@webstudio-is/icons";
import { LinkButton as LinkButtonComponent } from "./button";
import { StoryGrid, StorySection } from "./storybook";

export default {
  title: "Link Button",
};

const colors: ReadonlyArray<
  ComponentProps<typeof LinkButtonComponent>["color"]
> = ["primary", "neutral", "destructive", "neutral-destructive", "ghost"];

const states: ReadonlyArray<
  ComponentProps<typeof LinkButtonComponent>["state"]
> = ["auto", "hover", "focus", "pressed", "pending"];

export const LinkButton = () => (
  <>
    <StorySection title="Colors & States">
      <StoryGrid>
        {colors.map((color) => (
          <StoryGrid horizontal key={color}>
            {states.map((state) => (
              <LinkButtonComponent
                href="#link-button"
                state={state}
                color={color}
                key={state}
              >
                {color} {state}
              </LinkButtonComponent>
            ))}
            <LinkButtonComponent
              href="#link-button"
              color={color}
              aria-disabled
            >
              {color} disabled
            </LinkButtonComponent>
          </StoryGrid>
        ))}
      </StoryGrid>
    </StorySection>

    <StorySection title="Anchor properties">
      <StoryGrid horizontal>
        <LinkButtonComponent color="primary" href="#link-button">
          Internal link
        </LinkButtonComponent>
        <LinkButtonComponent
          href="https://webstudio.is"
          target="_blank"
          rel="noreferrer"
          suffix={<ExternalLinkIcon />}
        >
          External link
        </LinkButtonComponent>
      </StoryGrid>
    </StorySection>
  </>
);

undefined;
