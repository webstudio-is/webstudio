/**
 * A palette of 50 perceptually-uniform oklch colors, one per collaborator slot.
 * Generated with the golden-angle hue distribution (137.5deg) so adjacent slots
 * are maximally distinguishable.
 */
export const collaboratorColorPalette = Array.from(
  { length: 50 },
  (_, index) => {
    const lightness = 55 + (index % 3) * 3;
    const chroma = 0.14 + (index % 2) * 0.02;
    const hue = (index * 137.5) % 360;
    return `oklch(${lightness}% ${chroma.toFixed(2)} ${hue.toFixed(1)})`;
  }
);

/**
 * Returns a deterministic oklch color string for the given collaborator id.
 * The same id always maps to the same color across all clients.
 */
export const collaboratorColor = (id: string): string => {
  const hash = hashCollaboratorId(id);
  return collaboratorColorPalette[hash % collaboratorColorPalette.length]!;
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
    let slot = hashCollaboratorId(id) % collaboratorColorPalette.length;

    while (usedSlots.has(slot)) {
      slot += 1;
    }

    usedSlots.add(slot);
    assignedColors.set(id, collaboratorColorForSlot(slot));
  }

  return assignedColors;
};

const hashCollaboratorId = (id: string): number => {
  let hash = 0;
  for (let charIndex = 0; charIndex < id.length; charIndex++) {
    hash = (hash * 31 + id.charCodeAt(charIndex)) >>> 0;
  }
  return hash;
};

const collaboratorColorForSlot = (slot: number): string => {
  if (slot < collaboratorColorPalette.length) {
    return collaboratorColorPalette[slot]!;
  }

  const lightness = 52 + ((slot * 7) % 19);
  const chroma = 0.12 + ((slot * 3) % 5) * 0.01;
  const hue = (slot * 137.5) % 360;
  return `oklch(${lightness}% ${chroma.toFixed(2)} ${hue.toFixed(1)})`;
};
