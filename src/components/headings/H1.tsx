import React, { HTMLProps } from "react";
import { mergeClassNames } from "../../libs/components";

const H1: React.FC<HTMLProps<HTMLHeadingElement>> = ({
  className = "",
  children,
  ...otherProps
}) => {
  return (
    <h1
      className={mergeClassNames(
        "font-heading font-bold text-5xl text-black",
        className
      )}
      {...otherProps}
    >
      {children}
    </h1>
  );
};

export default H1;
