export const colors = Array.from({ length: 50 }, (_, i) => {
  const l = 55 + (i % 3) * 3; // Reduced variation in lightness (55-61%) to lower contrast
  const c = 0.14 + (i % 2) * 0.02; // Reduced variation in chroma (0.14-0.16) for balance
  const h = (i * 137.5) % 360; // Golden angle for pleasing hue distribution
  return `oklch(${l}% ${c.toFixed(2)} ${h.toFixed(1)})`;
});
