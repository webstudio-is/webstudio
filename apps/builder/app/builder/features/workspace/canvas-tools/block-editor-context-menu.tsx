import { useStore } from "@nanostores/react";
import { styled } from "@webstudio-is/design-system";

import {
  $instances,
  $modifierKeys,
  $textEditingInstanceSelector,
  $textEditorContextMenu,
  $textEditorContextMenuCommand,
  findTemplates,
} from "~/shared/nano-states";
import { applyScale } from "./outline";
import { $scale } from "~/builder/shared/nano-states";
import { TemplatesMenu } from "./outline/block-instance-outline";
import { insertTemplateAt } from "./outline/block-utils";
import { useCallback, useEffect, useState } from "react";
import { useEffectEvent } from "~/shared/hook-utils/effect-event";
import type { InstanceSelector } from "~/shared/tree-utils";
import type { Instance } from "@webstudio-is/sdk";
import { shallowEqual } from "shallow-equal";

const TriggerButton = styled("button", {
  position: "absolute",
  appearance: "none",
  backgroundColor: "transparent",
  outline: "none",
  pointerEvents: "all",
  border: "none",
  overflow: "hidden",
  padding: 0,
});

const InertController = ({
  onChange,
}: {
  onChange: (inert: boolean) => void;
}) => {
  const handleChange = useEffectEvent(onChange);

  useEffect(() => {
    const timeout = setTimeout(() => {
      handleChange(false);
    }, 0);

    return () => {
      clearTimeout(timeout);
    };
  }, [handleChange]);

  return null;
};

const mod = (n: number, m: number): number => {
  return ((n % m) + m) % m;
};

const triggerTooltipContent = <>"Templates"</>;

const Menu = ({
  cursorRect,
  anchor,
  templates,
}: {
  cursorRect: DOMRect;
  anchor: InstanceSelector;
  templates: [instance: Instance, instanceSelector: InstanceSelector][];
}) => {
  const [inert, setInert] = useState(true);
  const modifierKeys = useStore($modifierKeys);
  const scale = useStore($scale);
  const rect = applyScale(cursorRect, scale);

  const [filtered, setFiltered] = useState({ repeat: 0, templates });
  const [value, setValue] = useState<InstanceSelector | undefined>(
    templates[0]?.[1] ?? undefined
  );

  const [intermediateValue, setIntermediateValue] = useState<
    InstanceSelector | undefined
  >();

  const handleValueChangeComplete = useCallback(
    (templateSelector: InstanceSelector) => {
      const insertBefore = modifierKeys.altKey;
      insertTemplateAt(templateSelector, anchor, insertBefore);
    },
    [anchor, modifierKeys.altKey]
  );

  const currentValue = intermediateValue ?? value;

  useEffect(() => {
    return $textEditorContextMenuCommand.listen((command) => {
      if (command === undefined) {
        return;
      }
      const type = command.type;

      switch (type) {
        case "filter": {
          const filter = command.value.toLowerCase();
          const filteredTemplates = templates.filter(([template]) => {
            const title = template.label ?? template.component;
            return title.toLowerCase().includes(filter);
          });

          setFiltered((prev) => {
            if (filteredTemplates.length === 0) {
              return { repeat: prev.repeat + 1, templates: [] };
            }

            return { repeat: 0, templates: filteredTemplates };
          });

          setValue(filteredTemplates[0]?.[1] ?? undefined);
          break;
        }

        case "selectNext": {
          const index = filtered.templates.findIndex(([_, selector]) =>
            shallowEqual(selector, currentValue)
          );
          const nextIndex = mod(index + 1, filtered.templates.length);
          setValue(filtered.templates[nextIndex]?.[1] ?? undefined);
          setIntermediateValue(undefined);
          break;
        }
        case "selectPrevious": {
          const index = filtered.templates.findIndex(([_, selector]) =>
            shallowEqual(selector, currentValue)
          );
          const prevIndex = mod(index - 1, filtered.templates.length);
          setValue(filtered.templates[prevIndex]?.[1] ?? undefined);
          setIntermediateValue(undefined);
          break;
        }

        case "enter": {
          if (currentValue !== undefined) {
            handleValueChangeComplete(currentValue);
          }
          break;
        }

        default:
          (type) satisfies never;
      }
    });
  }, [filtered.templates, templates, currentValue, handleValueChangeComplete]);

  // @todo repeat and close

  return (
    <>
      <TemplatesMenu
        open={true}
        onOpenChange={(open) => {
          if (open) {
            return;
          }
          $textEditorContextMenu.set(undefined);
        }}
        anchor={anchor}
        triggerTooltipContent={triggerTooltipContent}
        templates={filtered.templates}
        value={currentValue}
        onValueChangeComplete={handleValueChangeComplete}
        onValueChange={setIntermediateValue}
        modal={false}
        inert={inert}
        preventFocusOnHover={true}
      >
        <TriggerButton
          css={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          }}
        ></TriggerButton>
      </TemplatesMenu>
      <InertController onChange={setInert} />
    </>
  );
};

export const TextEditorContextMenu = () => {
  const textEditingInstanceSelector = useStore($textEditingInstanceSelector);
  const textEditorContextMenu = useStore($textEditorContextMenu);
  const instances = useStore($instances);

  if (textEditorContextMenu === undefined) {
    return;
  }

  if (textEditingInstanceSelector === undefined) {
    return;
  }

  const templates = findTemplates(
    textEditingInstanceSelector.selector,
    instances
  );

  if (templates === undefined) {
    return;
  }

  return (
    <Menu
      key={JSON.stringify(textEditingInstanceSelector.selector)}
      cursorRect={textEditorContextMenu.cursorRect}
      anchor={textEditingInstanceSelector.selector}
      templates={templates}
    />
  );
};
