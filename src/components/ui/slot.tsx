import * as React from "react";

/**
 * Minimal `asChild` Slot — merges the component's props (incl. className) onto a
 * single child element. Avoids pulling in the full Radix dependency for what we
 * only need on buttons wrapping <Link>.
 */
export const Slot = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ children, ...slotProps }, ref) => {
    if (!React.isValidElement(children)) return null;
    const child = children as React.ReactElement<any>;
    return React.cloneElement(child, {
      ...slotProps,
      ...child.props,
      ref,
      className: [slotProps.className, child.props.className].filter(Boolean).join(" "),
    });
  },
);
Slot.displayName = "Slot";
