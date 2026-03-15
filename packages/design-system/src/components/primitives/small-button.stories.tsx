import { Grid } from "../grid";
import { Flex } from "../flex";
import { Text } from "../text";
import { XSmallIcon, TrashIcon, PlusIcon } from "@webstudio-is/icons";
import {
  SmallButton as SmallButtonComponent,
  smallButtonVariants,
} from "./small-button";
import { StorySection } from "../storybook";

export default {
  title: "Primitives/Small Button",
  component: SmallButtonComponent,
};

const icons = [
  { icon: <XSmallIcon />, label: "XSmallIcon" },
  { icon: <TrashIcon />, label: "TrashIcon" },
  { icon: <PlusIcon />, label: "PlusIcon" },
];

export const SmallButton = () => (
  <>
    <StorySection title="Variants">
      <Grid columns={4} gap="3" align="center" css={{ width: 400 }}>
        <Text variant="labels">Variant</Text>
        {icons.map(({ label }) => (
          <Text key={label} variant="labels">
            {label}
          </Text>
        ))}

        {smallButtonVariants.map((variant) => (
          <>
            <Text variant="labels">{variant}</Text>
            {icons.map(({ icon, label }) => (
              <Flex key={`${variant}-${label}`} gap="2" align="center">
                <SmallButtonComponent variant={variant}>
                  {icon}
                </SmallButtonComponent>
                <SmallButtonComponent variant={variant} disabled>
                  {icon}
                </SmallButtonComponent>
              </Flex>
            ))}
          </>
        ))}
      </Grid>
    </StorySection>

    <StorySection title="Bleed">
      <Grid columns={2} gap="3" align="center" css={{ width: 200 }}>
        <Text variant="labels">Bleed (default)</Text>
        <Text variant="labels">No bleed</Text>
        {icons.map(({ icon, label }) => (
          <>
            <Flex key={`bleed-${label}`} align="center">
              <SmallButtonComponent>{icon}</SmallButtonComponent>
            </Flex>
            <Flex key={`no-bleed-${label}`} align="center">
              <SmallButtonComponent bleed={false}>{icon}</SmallButtonComponent>
            </Flex>
          </>
        ))}
      </Grid>
    </StorySection>

    <StorySection title="States">
      <Grid columns={3} gap="3" align="center" css={{ width: 300 }}>
        <Text variant="labels">Default</Text>
        <Text variant="labels">Open state</Text>
        <Text variant="labels">Focused</Text>
        {smallButtonVariants.map((variant) => (
          <>
            <Flex key={`default-${variant}`} align="center">
              <SmallButtonComponent variant={variant}>
                <PlusIcon />
              </SmallButtonComponent>
            </Flex>
            <Flex key={`open-${variant}`} align="center">
              <SmallButtonComponent variant={variant} data-state="open">
                <PlusIcon />
              </SmallButtonComponent>
            </Flex>
            <Flex key={`focused-${variant}`} align="center">
              <SmallButtonComponent variant={variant} data-focused={true}>
                <PlusIcon />
              </SmallButtonComponent>
            </Flex>
          </>
        ))}
      </Grid>
    </StorySection>
  </>
);
