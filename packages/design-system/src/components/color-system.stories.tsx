import { useEffect, useRef, useState } from "react";
import { kebabCase } from "change-case";
import engrammaUrl from "engramma?url";
import {
  colorControllerNames,
  darkColorControllers,
  lightColorControllers,
  semanticColor,
} from "../colors/color-system";
import { color } from "../design-tokens";

export default {
  title: "Foundations/Colors",
  parameters: { layout: "fullscreen" },
};

type Mode = "light" | "dark";
type ControllerKey = keyof typeof lightColorControllers;
type ControllerValues = Record<ControllerKey, string>;
type ControllerOverrides = Record<Mode, Partial<ControllerValues>>;
type ColorSnapshot = Record<Mode, Record<string, string>>;

const emptyOverrides: ControllerOverrides = { light: {}, dark: {} };

const controllerKey = (name: (typeof colorControllerNames)[number]) =>
  `theme${name[0].toUpperCase()}${name.slice(1)}` as ControllerKey;

const controllerEntries = colorControllerNames.map(
  (name) => [controllerKey(name), name] as const
);

const controllerKeys = new Set<string>(controllerEntries.map(([name]) => name));
const controllerNames = new Map<string, string>(controllerEntries);
const semanticKeys = new Set<string>(Object.keys(semanticColor));

const categoryForColor = (name: string) => {
  if (controllerKeys.has(name)) {
    return "controllers";
  }
  if (semanticKeys.has(name)) {
    return "semantic";
  }
  return "compatibility";
};

const adapterName = ({
  mode,
  category,
  name,
}: {
  mode: Mode;
  category: string;
  name: string;
}) => `${mode}-${category}-${kebabCase(name)}`;

const editableControllers = Object.fromEntries(
  (["light", "dark"] as const).flatMap((mode) =>
    controllerEntries.map(([name, shortName]) => [
      adapterName({ mode, category: "controllers", name: shortName }),
      { mode, name },
    ])
  )
) as Record<string, { mode: Mode; name: ControllerKey }>;

const resolveColorSet = (controllers: ControllerValues) => {
  const scope = document.createElement("div");
  scope.style.cssText =
    "position:fixed;pointer-events:none;visibility:hidden;inset:auto;";

  for (const [name, value] of Object.entries(color)) {
    scope.style.setProperty(`--colors-${name}`, value);
  }
  for (const [name, value] of Object.entries(controllers)) {
    scope.style.setProperty(`--colors-${name}`, value);
  }

  const probes = Object.entries(color).map(([name, value]) => {
    const probe = document.createElement("div");
    if (value.includes("gradient(")) {
      probe.style.backgroundImage = `var(--colors-${name})`;
    } else {
      probe.style.color = `var(--colors-${name})`;
    }
    scope.append(probe);
    return { name, probe, isGradient: value.includes("gradient(") };
  });

  document.body.append(scope);
  const resolved: Record<string, string> = {};
  for (const { name, probe, isGradient } of probes) {
    const computed = getComputedStyle(probe);
    const value = isGradient ? computed.backgroundImage : computed.color;
    if (value !== "" && value !== "none") {
      resolved[name] = value;
    }
  }
  scope.remove();
  return resolved;
};

const getSnapshot = (overrides: ControllerOverrides): ColorSnapshot => ({
  light: resolveColorSet({
    ...lightColorControllers,
    ...overrides.light,
  }),
  dark: resolveColorSet({
    ...darkColorControllers,
    ...overrides.dark,
  }),
});

const getEngrammaCss = (snapshot: ColorSnapshot) => {
  const declarations: string[] = [];
  for (const mode of ["light", "dark"] as const) {
    for (const [name, value] of Object.entries(snapshot[mode])) {
      declarations.push(
        `--${adapterName({ mode, category: categoryForColor(name), name: controllerNames.get(name) ?? name })}: ${value};`
      );
    }
  }
  return `:root {\n${declarations.join("\n")}\n}`;
};

const getEngrammaDocument = (snapshot: ColorSnapshot) => `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="color-scheme" content="light dark" />
    <style>
      html, body { height: 100%; margin: 0; }
      ${getEngrammaCss(snapshot)}
    </style>
  </head>
  <body>
    <engramma-app></engramma-app>
    <script type="module" src="${engrammaUrl}"></script>
    <script type="module">
      const editable = ${JSON.stringify(editableControllers)};
      const connect = () => {
        const app = document.querySelector("engramma-app");
        const root = app?.shadowRoot;
        if (!root) {
          requestAnimationFrame(connect);
          return;
        }
        const publishController = (editedValue) => {
          const selectedText =
            root.querySelector('[role="treeitem"][aria-selected="true"]')
              ?.textContent ?? "";
          const adapterName = Object.keys(editable).find((name) =>
            selectedText.includes(name)
          );
          if (!adapterName) {
            return;
          }
          const value = String(editedValue);
          parent.postMessage(
            {
              type: "webstudio-engramma-controller",
              controller: editable[adapterName],
              value,
            },
            "*"
          );
        };
        const wireColorInputs = () => {
          for (const input of root.querySelectorAll("color-input")) {
            if (input.hasAttribute("data-webstudio-controller-bridge")) {
              continue;
            }
            input.setAttribute("data-webstudio-controller-bridge", "");
            const initialValue = String(input.value);
            input.addEventListener("close", () => {
              if (String(input.value) !== initialValue) {
                publishController(input.value);
              }
            });
          }
        };
        wireColorInputs();
        new MutationObserver(wireColorInputs).observe(root, {
          childList: true,
          subtree: true,
        });
      };
      customElements.whenDefined("engramma-app").then(connect);
    </script>
  </body>
</html>
`;

export const ColorSystem = () => {
  const [overrides, setOverrides] =
    useState<ControllerOverrides>(emptyOverrides);
  const [snapshot, setSnapshot] = useState<ColorSnapshot>();
  const engrammaFrameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setSnapshot(getSnapshot(overrides));
  }, [overrides]);

  useEffect(() => {
    const receiveController = (event: MessageEvent) => {
      if (event.source !== engrammaFrameRef.current?.contentWindow) {
        return;
      }
      if (event.data?.type !== "webstudio-engramma-controller") {
        return;
      }

      const controller = event.data.controller as
        | { mode?: unknown; name?: unknown }
        | undefined;
      const value = event.data.value;
      if (
        (controller?.mode !== "light" && controller?.mode !== "dark") ||
        typeof controller.name !== "string" ||
        controllerKeys.has(controller.name) === false ||
        typeof value !== "string" ||
        CSS.supports("color", value) === false
      ) {
        return;
      }

      const mode = controller.mode;
      const name = controller.name as ControllerKey;
      setOverrides((current) => ({
        ...current,
        [mode]: { ...current[mode], [name]: value },
      }));
    };

    window.addEventListener("message", receiveController);
    return () => window.removeEventListener("message", receiveController);
  }, []);

  if (snapshot === undefined) {
    return null;
  }

  return (
    <iframe
      key={JSON.stringify(overrides)}
      ref={engrammaFrameRef}
      title="Engramma color system"
      srcDoc={getEngrammaDocument(snapshot)}
      style={{ display: "block", width: "100%", height: "100vh", border: 0 }}
    />
  );
};
