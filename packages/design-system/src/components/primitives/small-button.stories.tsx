import { Flex } from "../flex";
import { XSmallIcon, TrashIcon, PlusIcon } from "@webstudio-is/icons";
import { SmallButton } from "./small-button";

export default {
  title: "Primitives/Small Button",
  component: SmallButton,
};

export const Normal = () => (
  <Flex gap="5" align="center">
    <SmallButton>
      <XSmallIcon />
    </SmallButton>
    <SmallButton>
      <PlusIcon />
    </SmallButton>
    <SmallButton disabled>
      <XSmallIcon />
    </SmallButton>
  </Flex>
);

export const Destructive = () => (
  <Flex gap="5" align="center">
    <SmallButton variant="destructive">
      <TrashIcon />
    </SmallButton>
    <SmallButton variant="destructive" disabled>
      <TrashIcon />
    </SmallButton>
  </Flex>
);

export const Contrast = () => (
  <Flex
    gap="5"
    align="center"
    css={{ background: "#333", padding: 16, borderRadius: 8 }}
  >
    <SmallButton variant="contrast">
      <XSmallIcon />
    </SmallButton>
    <SmallButton variant="contrast" disabled>
      <XSmallIcon />
    </SmallButton>
  </Flex>
);

export const AllVariants = () => (
  <Flex direction="column" gap="5">
    <Flex gap="5" align="center">
      <SmallButton variant="normal">
        <XSmallIcon />
      </SmallButton>
      <SmallButton variant="destructive">
        <TrashIcon />
      </SmallButton>
    </Flex>
    <Flex
      gap="5"
      align="center"
      css={{ background: "#333", padding: 16, borderRadius: 8 }}
    >
      <SmallButton variant="contrast">
        <XSmallIcon />
      </SmallButton>
    </Flex>
  </Flex>
);
