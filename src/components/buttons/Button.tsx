import React, { forwardRef } from "react";
import { mergeClassNames } from "../../libs/components";

const Button = forwardRef<
  HTMLButtonElement,
  React.DetailedHTMLProps<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    HTMLButtonElement
  >
>(({ children, className = "", type = "button", ...props }, ref) => {
  return (
    <button
      ref={ref}
      type={type}
      className={mergeClassNames(
        "py-3 px-4 flex items-center justify-center rounded-lg font-bold default-transition",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
});

export default Button;
