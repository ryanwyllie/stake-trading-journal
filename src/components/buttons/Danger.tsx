import React, { ComponentProps, forwardRef } from "react";
import { mergeClassNames } from "../../libs/components";
import Button from "./Button";

const DangerButton = forwardRef<
  HTMLButtonElement,
  ComponentProps<typeof Button>
>(({ className = "", ...props }, ref) => {
  return (
    <Button
      ref={ref}
      className={mergeClassNames(
        "bg-red-500 text-white hover:bg-red-600 focus:bg-red-600",
        className
      )}
      {...props}
    />
  );
});

export default DangerButton;
