import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactElement,
  type Ref,
} from "react";
import { css, theme, type CSS } from "../stitches.config";

const panelContentStyle = css({
  boxSizing: "border-box",
  minWidth: 0,
  padding: theme.panel.padding,
});

type PanelContentProps<Component extends ElementType> = {
  as?: Component;
  css?: CSS;
} & Omit<ComponentPropsWithoutRef<Component>, "as" | "css">;

type PanelContentComponent = <Component extends ElementType = "div">(
  props: PanelContentProps<Component> & { ref?: Ref<HTMLElement> }
) => ReactElement | null;

const PanelContentRoot = forwardRef(
  (
    {
      as: Component = "div",
      className,
      css,
      ...props
    }: PanelContentProps<ElementType>,
    ref: Ref<HTMLElement>
  ) => {
    return (
      <Component
        {...props}
        ref={ref}
        className={panelContentStyle({ className, css })}
      />
    );
  }
);
PanelContentRoot.displayName = "PanelContent";

export const PanelContent = PanelContentRoot as PanelContentComponent;
