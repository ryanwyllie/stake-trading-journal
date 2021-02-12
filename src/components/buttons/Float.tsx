import React, { ComponentProps, forwardRef } from "react";
import { mergeClassNames } from "../../libs/components";
import Button from "./Button";

const FloatButton = forwardRef<
  HTMLButtonElement,
  ComponentProps<typeof Button>
>(({ className = "", ...props }, ref) => {
  return (
    <Button
      ref={ref}
      className={mergeClassNames(
        "font-normal px-3 py-2 text-gray-500 border border-transparent hover:border-teal-200 hover:shadow-lg hover:text-purple-500 focus:shadow-lg focus:border-teal-200 focus:text-purple-500",
        className
      )}
      {...props}
    />
  );
});

export default FloatButton;
