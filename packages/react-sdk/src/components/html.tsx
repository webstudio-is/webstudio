import { forwardRef, useContext, useEffect, useRef } from "react";
import { mergeRefs } from "@react-aria/utils";
import { ReactSdkContext } from "../context";

type Props = {
  code: string;
  executeScriptInCanvas: boolean;
};

/**
 * Scripts are executed when rendered client side
 */
const ExecutableHtml = forwardRef<HTMLDivElement, Props>((props, ref) => {
  const { code, executeScriptInCanvas, ...rest } = props;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) {
      return;
    }
    console.log(container);
    // the trick to execute inserted scripts
    const range = document.createRange();
    range.setStart(container, 0);
    const fragment = range.createContextualFragment(code);
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.append(fragment);
  }, [code]);

  return (
    <div
      {...rest}
      ref={mergeRefs(ref, containerRef)}
      style={{ display: "contents" }}
    />
  );
});

/**
 * Scripts are executed when rendered server side
 */
const InnerHtml = forwardRef<HTMLDivElement, Props>((props, ref) => {
  const { code, executeScriptInCanvas, ...rest } = props;

  return (
    <div
      {...rest}
      ref={ref}
      style={{ display: "contents" }}
      dangerouslySetInnerHTML={{ __html: props.code }}
    />
  );
});

export const Html = forwardRef<HTMLDivElement, Props>((props, ref) => {
  const { renderer } = useContext(ReactSdkContext);

  if (renderer === "canvas" && props.executeScriptInCanvas === true) {
    return <ExecutableHtml ref={ref} {...props} />;
  }

  return <InnerHtml ref={ref} {...props} />;
});

Html.displayName = "Html";
