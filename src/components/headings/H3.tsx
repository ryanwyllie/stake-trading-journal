import React, { HTMLProps } from "react";
import { mergeClassNames } from "../../libs/components";

const H3: React.FC<HTMLProps<HTMLHeadingElement>> = ({
  className = "",
  children,
  ...otherProps
}) => {
  return (
    <h3
      className={mergeClassNames(
        "font-heading font-bold text-3xl text-black",
        className
      )}
      {...otherProps}
    >
      {children}
    </h3>
  );
};

export default H3;
