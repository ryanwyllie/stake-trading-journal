import React, { ComponentProps, forwardRef } from "react";
import { mergeClassNames } from "../../libs/components";
import Button from "./Button";

const PrimaryButton = forwardRef<
  HTMLButtonElement,
  ComponentProps<typeof Button>
>(({ className = "", ...props }, ref) => {
  return (
    <Button
      ref={ref}
      className={mergeClassNames(
        "bg-black text-white hover:ring-4 hover:ring-gray-200 focus:ring-4 focus:ring-gray-200",
        className
      )}
      {...props}
    />
  );
});

export default PrimaryButton;
