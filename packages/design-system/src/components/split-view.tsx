import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { css, theme } from "../stitches.config";
import { Box } from "./box";
import { numericScrubControl } from "./primitives/numeric-gesture-control";

const separatorWidth = 1;

const separatorStyle = css({
  position: "relative",
  width: separatorWidth,
  height: "100%",
  cursor: "col-resize",
  touchAction: "none",
  outline: "none",
  background: theme.colors.borderMain,
  "&::before": {
    position: "absolute",
    content: '""',
    insetBlock: 0,
    left: -2,
    right: -2,
  },
  "&:hover, &:focus-visible": {
    background: theme.colors.backgroundPrimaryLight,
    boxShadow: `-1px 0 ${theme.colors.backgroundPrimaryLight}, 1px 0 ${theme.colors.backgroundPrimaryLight}`,
  },
});

const paneStyle = css({
  display: "grid",
  gridTemplateRows: "minmax(0, 1fr)",
  height: "100%",
  minHeight: 0,
  overflow: "hidden",
});

const clampPanelSize = ({
  size,
  containerSize,
  minimumStartSize,
  minimumEndSize,
  minimumRatio,
  maximumRatio,
}: {
  size: number;
  containerSize: number;
  minimumStartSize: number;
  minimumEndSize: number;
  minimumRatio: number;
  maximumRatio: number;
}) => {
  const availableSize = Math.max(0, containerSize - separatorWidth);
  const startMinimum = Math.max(
    availableSize * minimumRatio,
    Math.min(Math.max(0, minimumStartSize), availableSize / 2)
  );
  const endMinimum = Math.max(
    availableSize * (1 - maximumRatio),
    Math.min(Math.max(0, minimumEndSize), availableSize / 2)
  );
  return Math.min(availableSize - endMinimum, Math.max(startMinimum, size));
};

export const SplitView = ({
  start,
  end,
  separatorLabel,
  defaultSize = { value: 50, unit: "%" },
  minimumStartSize = 160,
  minimumEndSize = 160,
  minimumRatio = 0.2,
  maximumRatio = 0.8,
}: {
  start: ReactNode;
  end?: ReactNode;
  separatorLabel: string;
  defaultSize?: { value: number; unit: "%" | "px" };
  minimumStartSize?: number;
  minimumEndSize?: number;
  minimumRatio?: number;
  maximumRatio?: number;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const separatorRef = useRef<HTMLDivElement>(null);
  const normalizedMinimumRatio = Math.min(1, Math.max(0, minimumRatio));
  const normalizedMaximumRatio = Math.min(
    1,
    Math.max(normalizedMinimumRatio, maximumRatio)
  );
  const sizeUnitRef = useRef(defaultSize.unit);
  const initialSize =
    defaultSize.unit === "%"
      ? Math.min(
          normalizedMaximumRatio * 100,
          Math.max(normalizedMinimumRatio * 100, defaultSize.value)
        )
      : Math.max(0, defaultSize.value);
  const sizeRef = useRef(initialSize);
  const [size, setSize] = useState(initialSize);
  const [containerSize, setContainerSize] = useState(0);
  const resizable = end !== undefined;

  const getStartSize = useCallback((containerSize: number) => {
    if (sizeUnitRef.current === "px") {
      return sizeRef.current;
    }
    return (
      (Math.max(0, containerSize - separatorWidth) * sizeRef.current) / 100
    );
  }, []);

  const updateSize = useCallback(
    (size: number) => {
      const containerSize =
        containerRef.current?.getBoundingClientRect().width ?? 0;
      if (containerSize === 0) {
        return;
      }
      const nextSize = clampPanelSize({
        size,
        containerSize,
        minimumStartSize,
        minimumEndSize,
        minimumRatio: normalizedMinimumRatio,
        maximumRatio: normalizedMaximumRatio,
      });
      sizeRef.current =
        sizeUnitRef.current === "px"
          ? nextSize
          : (nextSize / Math.max(1, containerSize - separatorWidth)) * 100;
      setSize(sizeRef.current);
    },
    [
      minimumEndSize,
      minimumStartSize,
      normalizedMaximumRatio,
      normalizedMinimumRatio,
    ]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (container === null || resizable === false) {
      return;
    }
    const updateContainerSize = () => {
      setContainerSize(container.getBoundingClientRect().width);
    };
    updateContainerSize();
    const observer = new ResizeObserver(updateContainerSize);
    observer.observe(container);
    return () => observer.disconnect();
  }, [resizable]);

  useEffect(() => {
    const separator = separatorRef.current;
    if (separator === null) {
      return;
    }

    return numericScrubControl(separator, {
      getInitialValue: () => {
        const width = containerRef.current?.getBoundingClientRect().width ?? 0;
        return getStartSize(width);
      },
      getValue: (state, movement) => state.value + movement,
      onValueInput: (event) => updateSize(event.value),
    });
  }, [getStartSize, resizable, updateSize]);

  if (end === undefined) {
    return <Box className={paneStyle()}>{start}</Box>;
  }

  const renderedStartSize =
    containerSize === 0
      ? undefined
      : clampPanelSize({
          size: getStartSize(containerSize),
          containerSize,
          minimumStartSize,
          minimumEndSize,
          minimumRatio: normalizedMinimumRatio,
          maximumRatio: normalizedMaximumRatio,
        });
  const renderedPercentage =
    renderedStartSize === undefined
      ? size
      : (renderedStartSize / Math.max(1, containerSize - separatorWidth)) * 100;

  return (
    <Box
      ref={containerRef}
      css={{
        display: "grid",
        height: "100%",
        minWidth: 0,
        minHeight: 0,
      }}
      style={{
        gridTemplateColumns:
          renderedStartSize !== undefined
            ? `minmax(0, ${renderedStartSize}px) ${separatorWidth}px minmax(0, 1fr)`
            : sizeUnitRef.current === "px"
              ? `minmax(0, ${size}px) ${separatorWidth}px minmax(0, 1fr)`
              : `minmax(0, ${size / 100}fr) ${separatorWidth}px minmax(0, ${1 - size / 100}fr)`,
      }}
    >
      <Box className={paneStyle()}>{start}</Box>
      <div
        ref={separatorRef}
        className={separatorStyle()}
        role="separator"
        aria-label={separatorLabel}
        aria-orientation="vertical"
        aria-valuemin={
          sizeUnitRef.current === "px"
            ? minimumStartSize
            : Math.round(normalizedMinimumRatio * 100)
        }
        aria-valuemax={
          sizeUnitRef.current === "px"
            ? undefined
            : Math.round(normalizedMaximumRatio * 100)
        }
        aria-valuenow={Math.round(
          sizeUnitRef.current === "px"
            ? (renderedStartSize ?? size)
            : renderedPercentage
        )}
        tabIndex={0}
        onKeyDown={(event) => {
          const width =
            containerRef.current?.getBoundingClientRect().width ?? 0;
          const step = (width - separatorWidth) * 0.05;
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            updateSize(getStartSize(width) - step);
          }
          if (event.key === "ArrowRight") {
            event.preventDefault();
            updateSize(getStartSize(width) + step);
          }
        }}
      />
      <Box className={paneStyle()}>{end}</Box>
    </Box>
  );
};
