import { TrashIcon } from "@webstudio-is/icons";
import {
  SmallIconButton as SmallIconButtonComponent,
  smallIconButtonStates,
  smallIconButtonVariants,
} from "./small-icon-button";
import { StorySection, StoryGrid } from "./storybook";

const states = [undefined, ...smallIconButtonStates];

export const SmallIconButton = () => (
  <>
    <StorySection title="Variants & States">
      <StoryGrid>
        {smallIconButtonVariants.map((variant) => (
          <StoryGrid horizontal key={variant}>
            {states.map((state) => (
              <SmallIconButtonComponent
                key={state ?? "undefined"}
                title={`${variant} ${state}`}
                icon={<TrashIcon />}
                state={state}
                variant={variant}
              />
            ))}
          </StoryGrid>
        ))}
      </StoryGrid>
    </StorySection>

    <StorySection title="Focus">
      <StoryGrid>
        {smallIconButtonVariants.map((variant) => (
          <StoryGrid horizontal key={variant}>
            {states.map((state) => (
              <SmallIconButtonComponent
                key={state ?? "undefined"}
                title={`${variant} ${state}`}
                icon={<TrashIcon />}
                state={state}
                variant={variant}
                focused
              />
            ))}
          </StoryGrid>
        ))}
      </StoryGrid>
    </StorySection>

    <StorySection title="Disabled across variants">
      <StoryGrid horizontal>
        {smallIconButtonVariants.map((variant) => (
          <SmallIconButtonComponent
            key={variant}
            title={variant}
            icon={<TrashIcon />}
            variant={variant}
            disabled
          />
        ))}
      </StoryGrid>
    </StorySection>
  </>
);

export default {
  title: "Small Icon Button",
  parameters: {
    // to make the variant=contrast visible
    backgrounds: { default: "Maintenance Medium" },
  },
};
