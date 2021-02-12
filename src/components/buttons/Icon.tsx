import React, { ComponentProps, forwardRef } from "react";
import { mergeClassNames } from "../../libs/components";
import Button from "./Button";

const IconButton = forwardRef<HTMLButtonElement, ComponentProps<typeof Button>>(
  ({ className = "", ...props }, ref) => {
    return (
      <Button
        ref={ref}
        className={mergeClassNames(
          "rounded-full px-2 py-2 bg-gradient-to-r hover:text-black hover:from-teal-200 hover:to-cyan-200 focus:text-black focus:from-teal-200 focus:to-cyan-200",
          className
        )}
        {...props}
      />
    );
  }
);

export default IconButton;
