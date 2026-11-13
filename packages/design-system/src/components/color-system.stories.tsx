import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import colorSourceCss from "../colors/colors.css?raw";
import {
  colorContrastContractCount,
  getColorContrast,
} from "../colors/color-contrast";
import { parseColorSource, type ColorMode } from "../colors/color-source-utils";

export default {
  title: "Foundations/Colors",
  parameters: { layout: "fullscreen" },
};

const source = parseColorSource(colorSourceCss);
const variable = (name: string) => `var(${name})`;

const cardStyle: CSSProperties = {
  minWidth: 0,
  overflow: "hidden",
  border: `1px solid ${variable("--border-default")}`,
  borderRadius: 8,
  background: variable("--background-primary"),
};

const labelStyle: CSSProperties = {
  display: "block",
  overflow: "hidden",
  textOverflow: "ellipsis",
  font: "600 12px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace",
  color: variable("--foreground-primary"),
};

const codeStyle: CSSProperties = {
  display: "block",
  marginTop: 8,
  padding: 8,
  borderRadius: 4,
  background: variable("--background-secondary"),
  overflowWrap: "anywhere",
  whiteSpace: "pre-wrap",
  font: "11px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace",
  color: variable("--foreground-secondary"),
};

const TokenCard = ({ name, value }: { name: string; value: string }) => (
  <article style={cardStyle}>
    <div
      aria-label={`${name} color preview`}
      style={{
        height: 72,
        background: variable(name),
        borderBottom: `1px solid ${variable("--border-default")}`,
      }}
    />
    <div style={{ padding: 10 }}>
      <code title={name} style={labelStyle}>
        {name}
      </code>
      <code style={codeStyle}>{`${name}: ${value};`}</code>
    </div>
  </article>
);

const TokenGrid = ({
  group,
  values,
}: {
  group: string;
  values: Record<string, string>;
}) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
      gap: 12,
    }}
  >
    {Object.entries(values).map(([name, value]) => (
      <TokenCard key={name} name={`--${group}-${name}`} value={value} />
    ))}
  </div>
);

const ThemeContrast = () => (
  <dl
    style={{
      ...cardStyle,
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
      gap: 12,
      padding: 12,
      margin: 0,
    }}
  >
    {Object.entries(source.theme.contrast).map(([name, value]) => (
      <div key={name}>
        <dt style={labelStyle}>{`--theme-contrast-${name}`}</dt>
        <dd style={{ ...codeStyle, marginInline: 0 }}>{value}</dd>
      </div>
    ))}
  </dl>
);

const ContrastPairs = ({
  mode,
  themeTestCase,
}: {
  mode: ColorMode;
  themeTestCase: string;
}) => {
  const [pairs, setPairs] = useState(() => getColorContrast(mode));

  useEffect(() => {
    setPairs(getColorContrast(mode));
  }, [mode, themeTestCase]);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        gap: 12,
      }}
    >
      {pairs.map((pair) => (
        <article
          key={`${pair.foreground}-${pair.background}`}
          style={cardStyle}
        >
          <div
            style={{
              display: "grid",
              placeItems: "center",
              height: 72,
              background: variable(pair.background),
              color: variable(pair.foreground),
              font: "700 24px/1 system-ui, sans-serif",
            }}
          >
            Aa
          </div>
          <div style={{ padding: 10 }}>
            <code style={labelStyle}>{pair.foreground}</code>
            <code style={codeStyle}>
              {`${pair.ratio.toFixed(2)}:1 · minimum ${pair.minimum}:1\non ${pair.background}`}
            </code>
          </div>
        </article>
      ))}
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
          color: variable("--foreground-secondary"),
          font: "14px/1.5 system-ui, sans-serif",
        }}
      >
        {description}
      </p>
    </div>
    {children}
  </section>
);

const ColorSystemPreview = ({
  mode,
  themeTestCase,
}: {
  mode: ColorMode;
  themeTestCase: string;
}) => {
  return (
    <main
      style={{
        minHeight: "100vh",
        boxSizing: "border-box",
        padding: 24,
        background: variable("--background-primary"),
        color: variable("--foreground-primary"),
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
        <header>
          <div>
            <h1
              style={{ margin: 0, font: "700 28px/1.25 system-ui, sans-serif" }}
            >
              Color system
            </h1>
            <p
              style={{
                maxWidth: 760,
                margin: "8px 0 0",
                color: variable("--foreground-secondary"),
                font: "14px/1.55 system-ui, sans-serif",
              }}
            >
              CSS derives a small Craft semantic vocabulary from nine bounded
              theme parameters. Every card shows its declaration directly from
              colors.css.
            </p>
          </div>
        </header>

        <Section
          title={`Theme colors · ${Object.keys(source.theme.color).length}`}
          description="Theme authors choose each color family once. The recipe normalizes them into safe semantic roles."
        >
          <TokenGrid group="theme-color" values={source.theme.color} />
        </Section>

        <Section
          title={`Theme contrast · ${Object.keys(source.theme.contrast).length}`}
          description="Bounded percentages shape content, surface, and border relationships in both color schemes."
        >
          <ThemeContrast />
        </Section>

        <Section
          title={`Contrast contracts · ${colorContrastContractCount}`}
          description="Required text and non-text pairings are validated in both schemes."
        >
          <ContrastPairs mode={mode} themeTestCase={themeTestCase} />
        </Section>

        <Section
          title={`Derived colors · ${Object.keys(source.derived).length}`}
          description="Derived colors normalize theme parameters before they feed the semantic graph."
        >
          <TokenGrid group="color" values={source.derived} />
        </Section>

        {Object.entries(source.semantic).map(([category, colors]) => (
          <Section
            key={category}
            title={`${category[0].toUpperCase() + category.slice(1)} · ${Object.keys(colors).length}`}
            description={`Reusable Craft ${category} decisions. Component states compose these values instead of adding component-specific colors.`}
          >
            <TokenGrid group={category} values={colors} />
          </Section>
        ))}
      </div>
    </main>
  );
};

export const ColorSystem = (
  _args: unknown,
  { globals }: { globals: Record<string, unknown> }
) => (
  <ColorSystemPreview
    mode={globals.colorScheme === "dark" ? "dark" : "light"}
    themeTestCase={
      typeof globals.themeTestCase === "string"
        ? globals.themeTestCase
        : "default"
    }
  />
);
