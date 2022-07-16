import { CSSProperties, useRef } from "react";

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

export const Canvas = ({ data }: CanvasProps) => {
  let rootRef = useRef(null);
  return (
    <div
      ref={rootRef}
      onPointerDown={(ev) => console.log(findId(ev.target, rootRef.current))}
    >
      <CanvasNode item={data} />
    </div>
  );
};
