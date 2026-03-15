import { useEffect } from "react";
import { getStyleDeclKey, type StyleDecl } from "@webstudio-is/sdk";
import {
  Box,
  Flex,
  StorySection,
  Text,
  theme,
} from "@webstudio-is/design-system";
import { createDefaultPages } from "@webstudio-is/project-build";
import {
  $breakpoints,
  $instances,
  $pages,
  $selectedBreakpointId,
  $styles,
  $styleSourceSelections,
} from "~/shared/nano-states";
import { registerContainers } from "~/shared/sync/sync-stores";
import { BackgroundContent as BackgroundContentPanel } from "./background-content";
import { $awareness } from "~/shared/awareness";
import { useComputedStyleDecl } from "../../shared/model";
import { setRepeatedStyleItem } from "../../shared/repeated-style";
import { type StyleValue } from "@webstudio-is/css-engine";

registerContainers();
$breakpoints.set(new Map([["base", { id: "base", label: "" }]]));
$selectedBreakpointId.set("base");
$styleSourceSelections.set(
  new Map([["box", { instanceId: "box", values: ["local"] }]])
);
$instances.set(
  new Map([
    ["box", { type: "instance", id: "box", component: "Box", children: [] }],
  ])
);
$pages.set(
  createDefaultPages({
    homePageId: "homePageId",
    rootInstanceId: "box",
  })
);

const defaultBackgroundImage: StyleDecl = {
  breakpointId: "base",
  styleSourceId: "local",
  property: "backgroundImage",
  value: {
    type: "layers",
    value: [{ type: "keyword", value: "none" }],
  },
};

$styles.set(
  new Map([[getStyleDeclKey(defaultBackgroundImage), defaultBackgroundImage]])
);

$awareness.set({
  pageId: "homePageId",
  instanceSelector: ["box"],
});

const BackgroundStory = ({ styleValue }: { styleValue: StyleValue }) => {
  const backgroundImage = useComputedStyleDecl("background-image");

  useEffect(() => {
    setRepeatedStyleItem(backgroundImage, 0, styleValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box css={{ width: theme.sizes.sidebarWidth }}>
      <BackgroundContentPanel index={0} />
    </Box>
  );
};

export const BackgroundContent = () => (
  <StorySection title="Background content">
    <Flex direction="column" gap="5">
      <Flex direction="column" gap="5">
        <Text variant="labels">Image (none)</Text>
        <BackgroundStory styleValue={{ type: "keyword", value: "none" }} />
      </Flex>
      <Flex direction="column" gap="5">
        <Text variant="labels">Linear gradient</Text>
        <BackgroundStory
          styleValue={{
            type: "unparsed",
            value:
              "linear-gradient(135deg, rgba(255,126,95,1) 0%, rgba(254,180,123,1) 35%, rgba(134,168,231,1) 100%)",
          }}
        />
      </Flex>
      <Flex direction="column" gap="5">
        <Text variant="labels">Conic gradient</Text>
        <BackgroundStory
          styleValue={{
            type: "unparsed",
            value:
              "conic-gradient(from 0deg at 50% 50%, rgba(255,126,95,1) 0deg, rgba(254,180,123,1) 120deg, rgba(134,168,231,1) 240deg, rgba(255,126,95,1) 360deg)",
          }}
        />
      </Flex>
      <Flex direction="column" gap="5">
        <Text variant="labels">Radial gradient</Text>
        <BackgroundStory
          styleValue={{
            type: "unparsed",
            value:
              "radial-gradient(circle at 50% 50%, rgba(255,126,95,1) 0%, rgba(254,180,123,1) 50%, rgba(134,168,231,1) 100%)",
          }}
        />
      </Flex>
      <Flex direction="column" gap="5">
        <Text variant="labels">Solid</Text>
        <BackgroundStory
          styleValue={{
            type: "unparsed",
            value:
              "linear-gradient(0deg, rgba(56,189,248,1) 0%, rgba(56,189,248,1) 100%)",
          }}
        />
      </Flex>
      <Flex direction="column" gap="5">
        <Text variant="labels">Repeating linear gradient</Text>
        <BackgroundStory
          styleValue={{
            type: "unparsed",
            value:
              "repeating-linear-gradient(45deg, rgba(255,0,0,1) 0%, rgba(0,0,255,1) 10%, rgba(255,0,0,1) 20%)",
          }}
        />
      </Flex>
      <Flex direction="column" gap="5">
        <Text variant="labels">Multi-stop gradient</Text>
        <BackgroundStory
          styleValue={{
            type: "unparsed",
            value:
              "linear-gradient(90deg, rgba(255,0,0,1) 0%, rgba(255,165,0,1) 20%, rgba(255,255,0,1) 40%, rgba(0,128,0,1) 60%, rgba(0,0,255,1) 80%, rgba(128,0,128,1) 100%)",
          }}
        />
      </Flex>
    </Flex>
  </StorySection>
);

export default {
  title: "Style panel/Backgrounds",
  component: BackgroundContentPanel,
};
