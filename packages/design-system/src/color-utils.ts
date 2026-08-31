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
