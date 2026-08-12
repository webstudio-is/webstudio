export type Viewport = { readonly width: number; readonly height: number };

export type ViewportRange<Purpose> = {
  minimumWidth: number;
  maximumWidth?: number;
  purpose: Purpose;
};

export type RepresentativeViewport<Purpose> = Viewport & {
  purposes: Purpose[];
};

export const commonViewports: readonly Viewport[] = [
  { width: 390, height: 844 },
  { width: 667, height: 375 },
  { width: 820, height: 1180 },
  { width: 1024, height: 768 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];

export const selectRepresentativeViewports = <Purpose>({
  ranges,
  candidates = commonViewports,
}: {
  ranges: readonly ViewportRange<Purpose>[];
  candidates?: readonly Viewport[];
}): RepresentativeViewport<Purpose>[] => {
  const selections = new Map<
    number,
    { height: number; purposes: Set<Purpose> }
  >();
  for (const { minimumWidth, maximumWidth, purpose } of ranges) {
    const matchingCandidates = candidates.filter(
      ({ width }) =>
        width >= minimumWidth &&
        (maximumWidth === undefined || width <= maximumWidth)
    );
    const targetWidth =
      maximumWidth === undefined
        ? minimumWidth
        : (minimumWidth + maximumWidth) / 2;
    const viewport = matchingCandidates.toSorted(
      (left, right) =>
        Math.abs(left.width - targetWidth) -
          Math.abs(right.width - targetWidth) || left.width - right.width
    )[0];
    const selected =
      viewport ??
      ({
        width: maximumWidth ?? minimumWidth,
        height: (maximumWidth ?? minimumWidth) <= 480 ? 844 : 900,
      } satisfies Viewport);
    const existing = selections.get(selected.width);
    if (existing === undefined) {
      selections.set(selected.width, {
        height: selected.height,
        purposes: new Set([purpose]),
      });
    } else {
      existing.purposes.add(purpose);
    }
  }
  return [...selections.entries()]
    .sort(([left], [right]) => left - right)
    .map(([width, { height, purposes }]) => ({
      width,
      height,
      purposes: [...purposes],
    }));
};
