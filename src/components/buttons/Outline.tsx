import React, { ComponentProps, forwardRef } from "react";
import { mergeClassNames } from "../../libs/components";
import Button from "./Button";

const OutlineButton = forwardRef<
  HTMLButtonElement,
  ComponentProps<typeof Button>
>(({ className = "", ...props }, ref) => {
  return (
    <Button
      ref={ref}
      className={mergeClassNames(
        "border-2 border-gray-300 hover:text-purple-500 hover:border-purple-500 focus:text-purple-500 focus:border-purple-500",
        className
      )}
      {...props}
    />
  );
});

export default OutlineButton;
