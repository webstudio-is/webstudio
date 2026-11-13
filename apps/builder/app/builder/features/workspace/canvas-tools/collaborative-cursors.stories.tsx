import { useEffect, useState } from "react";
import { Box } from "@webstudio-is/design-system";
import { $collaborators } from "@webstudio-is/sync-client";
import {
  $collaborativeInstanceSelector,
  $selectedPageId,
} from "~/shared/nano-states";
import { $canvasRect } from "~/builder/shared/nano-states";
import { CollaborativeCursors } from "./collaborative-cursors";

export default {
  title: "Canvas tools/Collaborative cursors",
  component: CollaborativeCursors,
};

const PaletteStory = ({ surface }: { surface: "bright" | "dark" }) => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const previous = {
      collaborators: $collaborators.get(),
      selectedPageId: $selectedPageId.get(),
      collaborativeSelector: $collaborativeInstanceSelector.get(),
      canvasRect: $canvasRect.get(),
    };
    const collaborators = new Map($collaborators.get());
    collaborators.clear();
    for (let index = 0; index < 50; index += 1) {
      const xRatio = ((index % 10) + 1) / 12;
      const yRatio = (Math.floor(index / 10) + 1) / 6;
      collaborators.set(`client-${index}`, {
        name: `Editor ${index + 1}`,
        pageId: "home",
        pointerPosition: { x: 0, y: 0, xRatio, yRatio },
      });
    }
    $selectedPageId.set("home");
    $canvasRect.set(undefined);
    $collaborators.set(collaborators);
    setReady(true);
    return () => {
      $collaborators.set(previous.collaborators);
      $selectedPageId.set(previous.selectedPageId);
      $collaborativeInstanceSelector.set(previous.collaborativeSelector);
      $canvasRect.set(previous.canvasRect);
    };
  }, []);

  return (
    <>
      <Box
        css={{
          position: "fixed",
          inset: 0,
          backgroundColor: surface === "bright" ? "#fff" : "#151515",
        }}
      />
      {ready && <CollaborativeCursors />}
    </>
  );
};

export const BrightPalette = () => <PaletteStory surface="bright" />;
export const DarkPalette = () => <PaletteStory surface="dark" />;
