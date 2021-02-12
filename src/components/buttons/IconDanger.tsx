import React, { ComponentProps, forwardRef } from "react";
import { mergeClassNames } from "../../libs/components";
import IconButton from "./Icon";

const IconDangerButton = forwardRef<
  HTMLButtonElement,
  ComponentProps<typeof IconButton>
>(({ className = "", ...props }, ref) => {
  return (
    <IconButton
      ref={ref}
      className={mergeClassNames(
        "bg-none hover:text-white hover:bg-red-500 focus:text-white focus:bg-red-500",
        className
      )}
      {...props}
    />
  );
});

export default IconDangerButton;
