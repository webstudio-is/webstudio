import { Grid } from "../grid";
import { Flex } from "../flex";
import { Text } from "../text";
import { XSmallIcon, TrashIcon, PlusIcon } from "@webstudio-is/icons";
import { SmallButton, smallButtonVariants } from "./small-button";

export default {
  title: "Primitives/Small Button",
  component: SmallButton,
};

const icons = [
  { icon: <XSmallIcon />, label: "XSmallIcon" },
  { icon: <TrashIcon />, label: "TrashIcon" },
  { icon: <PlusIcon />, label: "PlusIcon" },
];

export const Demo = () => (
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
            <SmallButton variant={variant}>{icon}</SmallButton>
            <SmallButton variant={variant} disabled>
              {icon}
            </SmallButton>
          </Flex>
        ))}
      </>
    ))}
  </Grid>
);
