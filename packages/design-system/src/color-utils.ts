import { cssVar } from "./css-var";

// Selection is a component state, composed from generic theme colors instead
// of being exposed as another theme parameter.
export const selectionBackground = `light-dark(
  color-mix(in oklab, ${cssVar("--background-accent")} 12%, ${cssVar(
    "--background-primary"
  )}),
  color-mix(in oklab, ${cssVar("--background-accent")} 20%, ${cssVar(
    "--background-primary"
  )})
)`;

export const rotateBoundedBackgroundHue = (color: string, degrees: number) => {
  const rotatedColor = `color(
    from oklch(from ${color} l c calc(h + ${degrees}))
    srgb clamp(0, r, 1) clamp(0, g, 1) clamp(0, b, 1)
  )`;
  const luminanceScale = "min(1, 0.18 / max(y, 0.000001))";

  return `color(
    from ${rotatedColor}
    xyz-d65
    calc(x * ${luminanceScale})
    calc(y * ${luminanceScale})
    calc(z * ${luminanceScale})
  )`;
};
