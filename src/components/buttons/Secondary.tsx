import React, { ComponentProps, forwardRef } from "react";
import { mergeClassNames } from "../../libs/components";
import Button from "./Button";

const SecondaryButton = forwardRef<
  HTMLButtonElement,
  ComponentProps<typeof Button>
>(({ className = "", ...props }, ref) => {
  return (
    <Button
      ref={ref}
      className={mergeClassNames(
        "bg-gray-200 hover:text-black hover:bg-gray-300 focus:text-black focus:bg-gray-300",
        className
      )}
      {...props}
    />
  );
});

export default SecondaryButton;
