/**
 * A palette of 50 perceptually-uniform oklch colors, one per collaborator slot.
 * Generated with the golden-angle hue distribution (137.5deg) so adjacent slots
 * are maximally distinguishable.
 */
const collaboratorColorForSlot = (slot: number): string => {
  const lightness = 55 + (slot % 3) * 3;
  const chroma = 0.14 + (slot % 2) * 0.02;
  const hue = (slot * 137.5) % 360;
  return `oklch(${lightness}% ${chroma.toFixed(2)} ${hue.toFixed(1)})`;
};

export const collaboratorColorPalette = Array.from({ length: 50 }, (_, slot) =>
  collaboratorColorForSlot(slot)
);

/**
 * Returns a deterministic oklch color string for the given collaborator id.
 * The same id always maps to the same color across all clients.
 */
export const collaboratorColor = (id: string): string => {
  return collaboratorColorPalette[
    getInitialColorSlot(id) % collaboratorColorPalette.length
  ]!;
};

/**
 * Assigns identity colors across the active collaborator set without reusing
 * colors.
 */
export const assignCollaboratorColors = (
  ids: Iterable<string>
): Map<string, string> => {
  const assignedColors = new Map<string, string>();
  const usedSlots = new Set<number>();

  for (const id of [...new Set(ids)].sort()) {
    let slot = getInitialColorSlot(id) % collaboratorColorPalette.length;

    while (usedSlots.has(slot)) {
      slot += 1;
    }

    usedSlots.add(slot);
    assignedColors.set(id, collaboratorColorForSlot(slot));
  }

  return assignedColors;
};

const getInitialColorSlot = (id: string): number => {
  let hash = 0;
  for (let charIndex = 0; charIndex < id.length; charIndex++) {
    hash = (hash * 31 + id.charCodeAt(charIndex)) >>> 0;
  }
  return hash;
};
