import { CSSProperties, useRef, useState } from "react";

type componentType = "div" | "p" | "ul" | "li" | "span";

export type Item = {
  id: string;
  type: componentType;
  style: CSSProperties;
  content: Item[] | string;
};

type CanvasProps = {
  data: Item;
};

const CanvasNode = ({ item }: { item: Item }) => {
  const children =
    typeof item.content === "string"
      ? item.content
      : item.content.map((child) => <CanvasNode item={child} key={child.id} />);

  switch (item.type) {
    case "div":
      return (
        <div style={item.style} data-id={item.id}>
          {children}
        </div>
      );
    case "p":
      return (
        <p style={item.style} data-id={item.id}>
          {children}
        </p>
      );
    case "ul":
      return (
        <ul style={item.style} data-id={item.id}>
          {children}
        </ul>
      );
    case "li":
      return (
        <li style={item.style} data-id={item.id}>
          <div>{children}</div>
        </li>
      );
    case "span":
      return (
        <span style={item.style} data-id={item.id}>
          {children}
        </span>
      );
  }
};

const canInsert = (item: Item, destanation: Item) => {
  if (destanation.type === "ul") {
    return item.type === "li";
  }

  if (destanation.type === "p") {
    return false;
  }

  return typeof destanation.content !== "string";
};

const findId = (
  domNode: EventTarget,
  root: HTMLElement | null
): string | null => {
  if (!(domNode instanceof HTMLElement)) {
    return null;
  }

  if (domNode.dataset.id != null) {
    return domNode.dataset.id;
  }

  let paretn = domNode.parentElement;

  if (paretn === root || paretn === null) {
    return null;
  }

  return findId(paretn, root);
};

const findElement = (
  root: HTMLElement | null,
  id: string
): HTMLElement | null => {
  if (root === null) {
    return null;
  }

  if (root.dataset.id === id) {
    return root;
  }

  const children = [...root.children];

  for (const child of children) {
    const result = findElement(child as HTMLElement, id);

    if (result != null) {
      return result;
    }
  }

  return null;
};

type InsertLocation =
  | { type: "vertical"; minX: number; maxX: number; y: number }
  | { type: "horizontal"; minY: number; maxY: number; x: number };

export const Canvas = ({ data }: CanvasProps) => {
  let rootRef = useRef(null);

  let [moveState, setMoveState] = useState<{
    initialPointerPosition: { x: number; y: number };
    initialRect: DOMRect;
    id: string;
  } | null>(null);

  let insertLocation: InsertLocation | null = {
    type: "vertical",
    minX: 0,
    maxX: 100,
    y: 0,
  } as InsertLocation;

  return (
    <div
      ref={rootRef}
      style={{ position: "relative" }}
      onPointerDown={(ev) => {
        const id = findId(ev.target, rootRef.current);

        if (id == null) {
          return;
        }

        const element = findElement(rootRef.current, id);

        if (element == null) {
          return;
        }

        setMoveState({
          id,
          initialRect: element.getBoundingClientRect(),
          initialPointerPosition: { x: ev.clientX, y: ev.clientY },
        });
      }}
      onPointerMove={(ev) => {
        if (moveState != null) {
          console.log(findId(ev.target, rootRef.current));
        }
      }}
      onPointerUp={(ev) => setMoveState(null)}
    >
      <CanvasNode item={data} />
      {insertLocation !== null && (
        <div
          style={{
            position: "absolute",
            left: "0",
            top: "0",
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        >
          <div
            style={
              insertLocation.type === "vertical"
                ? {
                    position: "absolute",
                    top: insertLocation.y,
                    left: insertLocation.minX,
                    width: insertLocation.maxX - insertLocation.minX,
                    height: "1px",
                    backgroundColor: "lightblue",
                  }
                : {
                    position: "absolute",
                    left: insertLocation.x,
                    top: insertLocation.minY,
                    height: insertLocation.maxY - insertLocation.minY,
                    width: "1px",
                    backgroundColor: "lightblue",
                  }
            }
          />
        </div>
      )}
    </div>
  );
};
