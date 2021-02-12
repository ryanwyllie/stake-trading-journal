import React, { ComponentProps, forwardRef } from "react";
import { mergeClassNames } from "../../libs/components";
import Button from "./Button";

const LinkButton = forwardRef<HTMLButtonElement, ComponentProps<typeof Button>>(
  ({ className = "", ...props }, ref) => {
    return (
      <Button
        ref={ref}
        className={mergeClassNames(
          "py-0 px-0 font-bold underline default-transition hover:text-purple-600 focus:text-purple-600",
          className
        )}
        {...props}
      />
    );
  }
);

export default LinkButton;
