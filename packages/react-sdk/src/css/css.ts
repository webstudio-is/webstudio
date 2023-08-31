import { createCssEngine, type TransformValue } from "@webstudio-is/css-engine";
import type { Asset, Assets } from "@webstudio-is/asset-uploader";
import type { Build } from "@webstudio-is/project-build";
import type { WsComponentMeta } from "../components/component-meta";
import { idAttribute } from "../tree";
import { addGlobalRules } from "./global-rules";
import { getPresetStyleRules, getStyleRules } from "./style-rules";

type Data = {
  assets: Asset[];
  breakpoints?: Build["breakpoints"];
  styles?: Build["styles"];
  styleSourceSelections?: Build["styleSourceSelections"];
  componentMetas: Map<string, WsComponentMeta>;
};

type CssOptions = {
  assetBaseUrl: string;
};

export const createImageValueTransformer =
  (assets: Assets, options: CssOptions): TransformValue =>
  (styleValue) => {
    if (styleValue.type === "image" && styleValue.value.type === "asset") {
      const asset = assets.get(styleValue.value.value);
      if (asset === undefined) {
        return { type: "keyword", value: "none" };
      }

      // @todo reuse image loaders and generate image-set
      const { assetBaseUrl } = options;
      const url = `${assetBaseUrl}${asset.name}`;

      return {
        type: "image",
        value: {
          type: "url",
          url,
        },
        hidden: styleValue.hidden,
      };
    }
  };

export const generateCssText = (data: Data, options: CssOptions) => {
  const assets: Assets = new Map(data.assets.map((asset) => [asset.id, asset]));
  const breakpoints = new Map(data.breakpoints);
  const styles = new Map(data.styles);
  const styleSourceSelections = new Map(data.styleSourceSelections);

  const engine = createCssEngine({ name: "ssr" });

  addGlobalRules(engine, {
    assets,
    assetBaseUrl: options.assetBaseUrl,
  });

  for (const breakpoint of breakpoints.values()) {
    engine.addMediaRule(breakpoint.id, breakpoint);
  }

  for (const [component, meta] of data.componentMetas) {
    const presetStyle = meta.presetStyle;
    if (presetStyle === undefined) {
      continue;
    }
    const rules = getPresetStyleRules(component, presetStyle);
    for (const [selector, style] of rules) {
      engine.addStyleRule(selector, { style });
    }
  }

  const styleRules = getStyleRules(styles, styleSourceSelections);
  for (const { breakpointId, instanceId, state, style } of styleRules) {
    engine.addStyleRule(
      `[${idAttribute}="${instanceId}"]${state ?? ""}`,
      {
        breakpoint: breakpointId,
        style,
      },
      createImageValueTransformer(assets, options)
    );
  }

  return engine.cssText;
};
