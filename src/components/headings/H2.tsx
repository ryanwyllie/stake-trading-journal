import React, { HTMLProps } from "react";
import { mergeClassNames } from "../../libs/components";

const H2: React.FC<HTMLProps<HTMLHeadingElement>> = ({
  className = "",
  children,
  ...otherProps
}) => {
  return (
    <h2
      className={mergeClassNames(
        "font-heading font-bold text-4xl text-black",
        className
      )}
      {...otherProps}
    >
      {children}
    </h2>
  );
};

export default H2;
