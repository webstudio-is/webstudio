import {
  useLayoutEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import "../colors/colors.css";
import colorSourceCss from "../colors/colors.css?raw";
import { getColorContrast } from "../colors/color-contrast";
import { parseColorSource, type ColorMode } from "../colors/color-source-utils";

export default {
  title: "Foundations/Colors",
  parameters: { layout: "fullscreen" },
};

const source = parseColorSource(colorSourceCss);
const contrast = {
  light: getColorContrast("light"),
  dark: getColorContrast("dark"),
};

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

const ContrastPairs = ({ mode }: { mode: ColorMode }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
      gap: 12,
    }}
  >
    {contrast[mode].map((pair) => (
      <article key={`${pair.foreground}-${pair.background}`} style={cardStyle}>
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

const useColorMode = (mode: ColorMode) => {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const previousMode = root.getAttribute("data-color-scheme");
    root.setAttribute("data-color-scheme", mode);
    return () => {
      if (previousMode === null) {
        root.removeAttribute("data-color-scheme");
      } else {
        root.setAttribute("data-color-scheme", previousMode);
      }
    };
  }, [mode]);
};

const ColorSystemPreview = ({ initialMode }: { initialMode: ColorMode }) => {
  const [mode, setMode] = useState<ColorMode>(initialMode);
  useColorMode(mode);

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
          <div
            aria-label="Color mode"
            role="group"
            style={{
              display: "flex",
              gap: 4,
              padding: 4,
              borderRadius: 8,
              background: variable("--background-secondary"),
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
                      ? variable("--background-primary")
                      : "transparent",
                  color: variable("--foreground-primary"),
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
          title={`Contrast contracts · ${contrast[mode].length}`}
          description="Required text and non-text pairings are validated in both schemes."
        >
          <ContrastPairs mode={mode} />
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

const CompactTokenGrid = ({
  group,
  values,
}: {
  group: string;
  values: Record<string, string>;
}) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(8, minmax(0, 1fr))",
      gap: 6,
    }}
  >
    {Object.keys(values).map((name) => {
      const variableName = `--${group}-${name}`;
      return (
        <div
          key={name}
          style={{
            display: "grid",
            alignItems: "end",
            minWidth: 0,
            height: 52,
            padding: 6,
            boxSizing: "border-box",
            border: `1px solid ${variable("--border-default")}`,
            borderRadius: 4,
            background:
              group === "overlay"
                ? `linear-gradient(${variable(variableName)}, ${variable(variableName)}), ${variable("--background-primary")}`
                : variable(variableName),
          }}
        >
          <code
            style={{
              overflow: "hidden",
              padding: 2,
              borderRadius: 2,
              background: variable("--background-primary"),
              color: variable("--foreground-primary"),
              font: "9px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {variableName}
          </code>
        </div>
      );
    })}
  </div>
);

const ColorSystemDarkSnapshot = () => {
  useColorMode("dark");

  return (
    <main
      style={{
        minHeight: "100vh",
        boxSizing: "border-box",
        display: "grid",
        alignContent: "start",
        gap: 14,
        padding: 16,
        background: variable("--background-primary"),
        color: variable("--foreground-primary"),
      }}
    >
      <h1 style={{ margin: 0, font: "700 20px/1.25 system-ui, sans-serif" }}>
        Dark color system
      </h1>
      <ThemeContrast />
      <CompactTokenGrid group="theme-color" values={source.theme.color} />
      {Object.entries(source.semantic).map(([category, colors]) => (
        <CompactTokenGrid key={category} group={category} values={colors} />
      ))}
    </main>
  );
};

export const ColorSystem = () => <ColorSystemPreview initialMode="light" />;

export const ColorSystemDark = () => <ColorSystemDarkSnapshot />;
