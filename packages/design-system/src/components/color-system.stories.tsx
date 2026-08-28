import { useState, type CSSProperties, type ReactNode } from "react";
import { colorTokenSource } from "../../tokens/colors";
import {
  darkColorControllers,
  lightColorControllers,
  semanticColor,
} from "../colors/color-system";
import {
  toColorVariableName,
  toCompatibilityColorVariableName,
} from "../colors/color-name-utils";
import { color } from "../design-tokens";

export default {
  title: "Foundations/Colors",
  parameters: { layout: "fullscreen" },
};

type Mode = "light" | "dark";
type RecipeGroup = "semantic" | "compatibility";

const themeVariableName = (name: string) =>
  `theme${name[0].toUpperCase()}${name.slice(1)}`;

const colorVariable = (name: string) => `var(${toColorVariableName(name)})`;
const compatibilityColorVariable = (name: string) =>
  `var(${toCompatibilityColorVariableName(name)})`;

const getThemeStyles = (mode: Mode) => {
  const styles: Record<string, string> = {};
  for (const [name, value] of Object.entries(semanticColor)) {
    styles[toColorVariableName(name)] = value;
  }
  for (const [name, value] of Object.entries(color)) {
    styles[toCompatibilityColorVariableName(name)] = value;
  }
  const controllers =
    mode === "light" ? lightColorControllers : darkColorControllers;
  for (const [name, value] of Object.entries(controllers)) {
    styles[toColorVariableName(themeVariableName(name))] = value;
  }
  return styles as CSSProperties;
};

const cardStyle: CSSProperties = {
  minWidth: 0,
  overflow: "hidden",
  border: `1px solid ${colorVariable("borderDefault")}`,
  borderRadius: 8,
  background: colorVariable("backgroundPrimary"),
};

const labelStyle: CSSProperties = {
  display: "block",
  overflow: "hidden",
  textOverflow: "ellipsis",
  font: "600 12px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace",
  color: colorVariable("foregroundPrimary"),
};

const recipeStyle: CSSProperties = {
  display: "block",
  marginTop: 4,
  padding: 8,
  borderRadius: 4,
  background: colorVariable("backgroundSecondary"),
  overflowWrap: "anywhere",
  whiteSpace: "pre-wrap",
  font: "11px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace",
  color: colorVariable("foregroundSecondary"),
};

const codeLabelStyle: CSSProperties = {
  display: "block",
  marginTop: 10,
  font: "600 10px/1.4 system-ui, sans-serif",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: colorVariable("foregroundSecondary"),
};

const TokenCard = ({
  group,
  name,
  recipe,
  cssValue,
}: {
  group: RecipeGroup;
  name: string;
  recipe: unknown;
  cssValue: string;
}) => (
  <article style={cardStyle}>
    <div
      aria-label={`${name} color preview`}
      style={{
        height: 72,
        background:
          group === "semantic"
            ? colorVariable(name)
            : compatibilityColorVariable(name),
        borderBottom: `1px solid ${colorVariable("borderDefault")}`,
      }}
    />
    <div style={{ padding: 10 }}>
      <code title={name} style={labelStyle}>
        {name}
      </code>
      <span style={codeLabelStyle}>CSS</span>
      <code
        style={recipeStyle}
      >{`${group === "semantic" ? toColorVariableName(name) : toCompatibilityColorVariableName(name)}: ${cssValue};`}</code>
      <span style={codeLabelStyle}>Source recipe</span>
      <code style={recipeStyle}>{JSON.stringify(recipe)}</code>
    </div>
  </article>
);

const TokenGrid = ({ group }: { group: RecipeGroup }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
      gap: 12,
    }}
  >
    {Object.entries(colorTokenSource[group]).map(([name, recipe]) => (
      <TokenCard
        key={name}
        group={group}
        name={name}
        recipe={recipe}
        cssValue={
          group === "semantic"
            ? semanticColor[name as keyof typeof semanticColor]
            : color[name as keyof typeof color]
        }
      />
    ))}
  </div>
);

const Controllers = ({ mode }: { mode: Mode }) => {
  const values =
    mode === "light" ? lightColorControllers : darkColorControllers;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: 12,
      }}
    >
      {Object.entries(colorTokenSource.controllers).map(
        ([name, controller]) => {
          const value = values[name as keyof typeof values];
          return (
            <article key={name} style={cardStyle}>
              <div
                aria-label={`${name} controller preview`}
                style={{
                  height: 96,
                  background: value,
                  borderBottom: `1px solid ${colorVariable("borderDefault")}`,
                }}
              />
              <div style={{ padding: 10 }}>
                <code style={labelStyle}>{name}</code>
                <span
                  style={{
                    display: "block",
                    marginTop: 4,
                    font: "12px/1.45 system-ui, sans-serif",
                    color: colorVariable("foregroundSecondary"),
                  }}
                >
                  {controller.description}
                </span>
                <span style={codeLabelStyle}>CSS</span>
                <code
                  style={recipeStyle}
                >{`${toColorVariableName(themeVariableName(name))}: ${value};`}</code>
                <span style={codeLabelStyle}>Source value</span>
                <code style={recipeStyle}>
                  {JSON.stringify(controller[mode])}
                </code>
              </div>
            </article>
          );
        }
      )}
    </div>
  );
};

const Section = ({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) => (
  <section style={{ display: "grid", gap: 12 }}>
    <div>
      <h2 style={{ margin: 0, font: "600 18px/1.4 system-ui, sans-serif" }}>
        {title}
      </h2>
      <p
        style={{
          margin: "4px 0 0",
          color: colorVariable("foregroundSecondary"),
          font: "14px/1.5 system-ui, sans-serif",
        }}
      >
        {description}
      </p>
    </div>
    {children}
  </section>
);

export const ColorSystem = () => {
  const [mode, setMode] = useState<Mode>("light");
  return (
    <main
      style={{
        ...getThemeStyles(mode),
        minHeight: "100vh",
        boxSizing: "border-box",
        padding: 24,
        background: colorVariable("backgroundPrimary"),
        color: colorVariable("foregroundPrimary"),
      }}
    >
      <div
        style={{
          display: "grid",
          gap: 32,
          width: "min(1440px, 100%)",
          margin: "0 auto",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "start",
            justifyContent: "space-between",
            gap: 24,
          }}
        >
          <div>
            <h1
              style={{ margin: 0, font: "700 28px/1.25 system-ui, sans-serif" }}
            >
              Color system
            </h1>
            <p
              style={{
                maxWidth: 720,
                margin: "8px 0 0",
                color: colorVariable("foregroundSecondary"),
                font: "14px/1.55 system-ui, sans-serif",
              }}
            >
              Seven theme controllers drive every semantic color through live
              relative CSS. Compatibility names preserve the current public API.
            </p>
          </div>
          <div
            aria-label="Color mode"
            role="group"
            style={{
              display: "flex",
              gap: 4,
              padding: 4,
              borderRadius: 8,
              background: colorVariable("backgroundMuted"),
            }}
          >
            {(["light", "dark"] as const).map((value) => (
              <button
                key={value}
                aria-pressed={mode === value}
                onClick={() => setMode(value)}
                style={{
                  padding: "7px 12px",
                  border: 0,
                  borderRadius: 6,
                  background:
                    mode === value
                      ? colorVariable("backgroundPrimary")
                      : "transparent",
                  color: colorVariable("foregroundPrimary"),
                  font: "600 12px/1 system-ui, sans-serif",
                  cursor: "pointer",
                }}
              >
                {value[0].toUpperCase() + value.slice(1)}
              </button>
            ))}
          </div>
        </header>

        <Section
          title={`Theme controllers · ${Object.keys(colorTokenSource.controllers).length}`}
          description="The only theme-specific colors. Change these to propagate through the entire graph."
        >
          <Controllers mode={mode} />
        </Section>

        <Section
          title={`Semantic colors · ${Object.keys(colorTokenSource.semantic).length}`}
          description="Purpose-based colors derived from controllers. Each card shows its emitted CSS and source recipe."
        >
          <TokenGrid group="semantic" />
        </Section>

        <details>
          <summary
            style={{
              cursor: "pointer",
              font: "600 18px/1.4 system-ui, sans-serif",
            }}
          >
            Compatibility colors ·{" "}
            {Object.keys(colorTokenSource.compatibility).length}
          </summary>
          <p
            style={{
              margin: "4px 0 12px",
              color: colorVariable("foregroundSecondary"),
              font: "14px/1.5 system-ui, sans-serif",
            }}
          >
            Existing design-system names mapped onto the new semantic graph.
          </p>
          <TokenGrid group="compatibility" />
        </details>
      </div>
    </main>
  );
};
