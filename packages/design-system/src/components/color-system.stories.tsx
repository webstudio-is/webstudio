import { useEffect, useRef, useState } from "react";
import { CheckMarkIcon, InfoCircleIcon, TrashIcon } from "@webstudio-is/icons";
import Color from "colorjs.io";
import engrammaUrl from "engramma?url";
import { Button } from "./button";
import { IconButton } from "./icon-button";
import { InputField } from "./input-field";
import { MenuItemButton, MenuList } from "./menu";
import { Text } from "./text";
import { Tooltip, TooltipProvider } from "./tooltip";
import {
  colorControllerNames,
  css,
  darkTheme,
  darkColorControllers,
  lightColorControllers,
  semanticColor,
  theme,
} from "../index";

export default {
  title: "Foundations/Colors",
};

const pageStyle = css({
  minHeight: "100vh",
  padding: theme.spacing[9],
  color: theme.colors.contentPrimary,
  background: theme.colors.backgroundCanvas,
});

const headerStyle = css({
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: theme.spacing[9],
  marginBottom: theme.spacing[10],
});

const headingStyle = css({
  margin: 0,
  fontFamily: theme.fonts.sans,
  fontSize: 24,
  lineHeight: 1.2,
});

const descriptionStyle = css({
  maxWidth: 680,
  margin: `${theme.spacing[3]} 0 0`,
  color: theme.colors.contentSecondary,
  fontFamily: theme.fonts.sans,
  fontSize: 13,
  lineHeight: 1.5,
});

const themeSwitchStyle = css({
  display: "flex",
  gap: theme.spacing[2],
  padding: theme.spacing[2],
  border: `1px solid ${theme.colors.borderDefault}`,
  borderRadius: theme.borderRadius[5],
  background: theme.colors.backgroundNeutralSubtle,
});

const sectionStyle = css({
  marginTop: theme.spacing[10],
});

const sectionTitleStyle = css({
  margin: `0 0 ${theme.spacing[5]}`,
  color: theme.colors.contentPrimary,
  fontFamily: theme.fonts.sans,
  fontSize: 14,
});

const swatchGridStyle = css({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
  gap: theme.spacing[5],
});

const swatchStyle = css({
  overflow: "hidden",
  border: `1px solid ${theme.colors.borderDefault}`,
  borderRadius: theme.borderRadius[5],
  background: theme.colors.backgroundNeutralSubtle,
});

const swatchColorStyle = css({ height: 72 });

const swatchLabelStyle = css({
  display: "grid",
  gap: theme.spacing[1],
  padding: theme.spacing[4],
  fontFamily: theme.fonts.mono,
  fontSize: 10,
});

const dependencyStyle = css({
  color: theme.colors.contentMuted,
  overflowWrap: "anywhere",
});

const contrastGridStyle = css({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: theme.spacing[5],
});

const contrastSampleStyle = css({
  display: "grid",
  gap: theme.spacing[2],
  padding: theme.spacing[6],
  border: `1px solid ${theme.colors.borderDefault}`,
  borderRadius: theme.borderRadius[5],
  fontFamily: theme.fonts.sans,
  fontSize: 12,
});

const compatibilityStyle = css({
  marginTop: theme.spacing[5],
  color: theme.colors.contentSecondary,
  fontFamily: theme.fonts.sans,
  fontSize: 12,
});

const componentGridStyle = css({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
  gap: theme.spacing[7],
});

const componentCardStyle = css({
  display: "grid",
  alignContent: "start",
  gap: theme.spacing[5],
  minHeight: 150,
  padding: theme.spacing[7],
  border: `1px solid ${theme.colors.borderDefault}`,
  borderRadius: theme.borderRadius[6],
  background: theme.colors.backgroundNeutralSubtle,
});

const rowStyle = css({
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: theme.spacing[3],
});

const engrammaPanelStyle = css({
  marginTop: theme.spacing[7],
  height: "min(760px, 80vh)",
  border: `1px solid ${theme.colors.borderDefault}`,
  borderRadius: theme.borderRadius[6],
  background: theme.colors.backgroundCanvas,
});

const engrammaFrameStyle = css({
  display: "block",
  width: "100%",
  height: "100%",
  border: 0,
  borderRadius: "inherit",
});

const controllerTokenName = (name: string) => `theme-${name}`;

const getControllerCss = (values: Record<string, string>) => {
  const declarations = Object.entries(values)
    .map(([name, value]) => `--colors-${name}: ${value};`)
    .join("\n");
  return `:root {\n${declarations}\n}`;
};

const getEngrammaDocument = (values: Record<string, string>) => `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="color-scheme" content="light dark" />
    <style>
      html, body { height: 100%; margin: 0; }
      ${getControllerCss(values)}
    </style>
  </head>
  <body>
    <engramma-app></engramma-app>
    <script type="module" src="${engrammaUrl}"></script>
    <script type="module">
      const names = ${JSON.stringify(colorControllerNames.map(controllerTokenName))};
      let previous = "";
      const publish = () => {
        const style = getComputedStyle(document.documentElement);
        const values = Object.fromEntries(
          names.map((name) => [name, style.getPropertyValue("--colors-" + name).trim()])
        );
        const serialized = JSON.stringify(values);
        if (serialized !== previous) {
          previous = serialized;
          parent.postMessage({ type: "webstudio-engramma-colors", values }, "*");
        }
      };
      publish();
      setInterval(publish, 250);
    </script>
  </body>
</html>
`;

const ColorSwatch = ({
  name,
  dependency,
}: {
  name: string;
  dependency?: string;
}) => (
  <div className={swatchStyle()}>
    <div
      className={swatchColorStyle()}
      style={{ background: `var(--colors-${name})` }}
    />
    <div className={swatchLabelStyle()}>
      <span>{name}</span>
      <span className={dependencyStyle()} title={dependency}>
        {dependency ?? "editable controller"}
      </span>
    </div>
  </div>
);

const contrastPairs = [
  ["Primary content", "contentPrimary", "backgroundCanvas"],
  ["Secondary content", "contentSecondary", "backgroundCanvas"],
  ["Inverse content", "contentInverse", "backgroundInverse"],
  ["Accent action", "contentInverse", "backgroundAccent"],
  ["Negative action", "contentInverse", "backgroundNegative"],
] as const;

const ContrastReport = () => {
  const sampleRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [ratios, setRatios] = useState<Record<string, number>>({});

  useEffect(() => {
    let previous = "";
    const update = () => {
      const next: Record<string, number> = {};
      for (const [label] of contrastPairs) {
        const sample = sampleRefs.current[label];
        if (sample === null || sample === undefined) {
          continue;
        }
        const computed = getComputedStyle(sample);
        next[label] = Color.contrastWCAG21(
          computed.color,
          computed.backgroundColor
        );
      }
      const serialized = JSON.stringify(next);
      if (serialized !== previous) {
        previous = serialized;
        setRatios(next);
      }
    };
    update();
    const interval = window.setInterval(update, 500);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className={contrastGridStyle()}>
      {contrastPairs.map(([label, foreground, background]) => {
        const ratio = ratios[label];
        const passes = ratio !== undefined && ratio >= 4.5;
        return (
          <div
            key={label}
            ref={(element) => {
              sampleRefs.current[label] = element;
            }}
            className={contrastSampleStyle()}
            style={{
              color: `var(--colors-${foreground})`,
              background: `var(--colors-${background})`,
            }}
          >
            <strong>{label}</strong>
            <span>
              {ratio === undefined
                ? "Measuring…"
                : `${ratio.toFixed(2)}:1 · ${passes ? "AA pass" : "AA failure"}`}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export const ColorLaboratory = () => {
  const [mode, setMode] = useState<"light" | "dark">("light");
  const [previewControllers, setPreviewControllers] = useState<
    Record<string, string> | undefined
  >();
  const engrammaFrameRef = useRef<HTMLIFrameElement>(null);

  const themeControllers =
    mode === "light" ? lightColorControllers : darkColorControllers;

  useEffect(() => {
    document.documentElement.classList.toggle(darkTheme, mode === "dark");
    document.documentElement.style.colorScheme = mode;

    return () => {
      document.documentElement.classList.remove(darkTheme);
      document.documentElement.style.removeProperty("color-scheme");
    };
  }, [mode]);

  useEffect(() => {
    setPreviewControllers(undefined);
    const receiveColors = (event: MessageEvent) => {
      if (event.source !== engrammaFrameRef.current?.contentWindow) {
        return;
      }
      if (event.data?.type !== "webstudio-engramma-colors") {
        return;
      }
      const values = event.data.values as Record<string, unknown>;
      const validated: Record<string, string> = {};
      for (const name of colorControllerNames.map(controllerTokenName)) {
        const value = values[name];
        if (
          typeof value !== "string" ||
          CSS.supports("color", value) === false
        ) {
          return;
        }
        validated[name] = value;
      }
      setPreviewControllers(validated);
    };
    window.addEventListener("message", receiveColors);
    return () => window.removeEventListener("message", receiveColors);
  }, [mode]);

  return (
    <main className={pageStyle()}>
      <style>{getControllerCss(previewControllers ?? themeControllers)}</style>
      <header className={headerStyle()}>
        <div>
          <h1 className={headingStyle()}>Color laboratory</h1>
          <p className={descriptionStyle()}>
            Seven theme colors control every surface, border, content color,
            feedback state, and interaction below through live OKLCH recipes.
            Engramma edits the active CSS variables, so changes cascade without
            a rebuild.
          </p>
        </div>
        <div className={themeSwitchStyle()} aria-label="Color theme">
          <Button
            color={mode === "light" ? "primary" : "neutral"}
            onClick={() => setMode("light")}
          >
            Light
          </Button>
          <Button
            color={mode === "dark" ? "primary" : "neutral"}
            onClick={() => setMode("dark")}
          >
            Dark
          </Button>
        </div>
      </header>

      <section className={sectionStyle()}>
        <h2 className={sectionTitleStyle()}>Seven editable controllers</h2>
        <div className={swatchGridStyle()}>
          {colorControllerNames.map((name) => (
            <ColorSwatch key={name} name={controllerTokenName(name)} />
          ))}
        </div>
      </section>

      <section className={sectionStyle()}>
        <h2 className={sectionTitleStyle()}>Derived semantic colors</h2>
        <div className={swatchGridStyle()}>
          {Object.entries(semanticColor).map(([name, dependency]) => (
            <ColorSwatch key={name} name={name} dependency={dependency} />
          ))}
        </div>
      </section>

      <section className={sectionStyle()}>
        <h2 className={sectionTitleStyle()}>Live contrast checks</h2>
        <ContrastReport />
        <div className={compatibilityStyle()}>
          Requires browser support for relative OKLCH colors and color-mix().
          The laboratory reports WCAG 2.1 AA failures at 4.5:1; controller
          changes are not assumed to remain accessible.
        </div>
      </section>

      <section className={sectionStyle()}>
        <h2 className={sectionTitleStyle()}>Representative components</h2>
        <div className={componentGridStyle()}>
          <div className={componentCardStyle()}>
            <Text variant="titles">Actions</Text>
            <div className={rowStyle()}>
              <Button>Primary</Button>
              <Button color="neutral">Neutral</Button>
              <Button color="destructive" prefix={<TrashIcon />}>
                Delete
              </Button>
              <Button color="positive" prefix={<CheckMarkIcon />}>
                Confirm
              </Button>
            </div>
          </div>

          <div className={componentCardStyle()}>
            <Text variant="titles">Input and text</Text>
            <InputField defaultValue="Editable value" />
            <InputField color="error" defaultValue="Invalid value" />
            <Text color="subtle">Secondary content</Text>
            <Text color="destructive">Destructive content</Text>
          </div>

          <div className={componentCardStyle()}>
            <Text variant="titles">Icon states</Text>
            <div className={rowStyle()}>
              <IconButton aria-label="Default">
                <InfoCircleIcon />
              </IconButton>
              <IconButton aria-label="Local" variant="local">
                <InfoCircleIcon />
              </IconButton>
              <IconButton aria-label="Remote" variant="remote">
                <InfoCircleIcon />
              </IconButton>
              <IconButton aria-label="Overwritten" variant="overwritten">
                <InfoCircleIcon />
              </IconButton>
            </div>
          </div>

          <div className={componentCardStyle()}>
            <Text variant="titles">Menu and tooltip</Text>
            <MenuList>
              <MenuItemButton>Regular item</MenuItemButton>
              <MenuItemButton destructive>Destructive item</MenuItemButton>
            </MenuList>
            <TooltipProvider>
              <Tooltip content="Derived inverse surface" defaultOpen>
                <Button color="ghost">Tooltip trigger</Button>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </section>

      <section className={sectionStyle()}>
        <h2 className={sectionTitleStyle()}>Engramma live editor</h2>
        <Text color="subtle">
          Edits are temporary preview overrides. Persist approved controller
          values in tokens/colors.resolver.json.
        </Text>
        <div className={engrammaPanelStyle()}>
          <iframe
            key={mode}
            ref={engrammaFrameRef}
            className={engrammaFrameStyle()}
            title="Engramma color token editor"
            srcDoc={getEngrammaDocument(themeControllers)}
          />
        </div>
      </section>
    </main>
  );
};
