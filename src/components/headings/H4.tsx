import React, { HTMLProps } from "react";
import { mergeClassNames } from "../../libs/components";

const H4: React.FC<HTMLProps<HTMLHeadingElement>> = ({
  className = "",
  children,
  ...otherProps
}) => {
  return (
    <h4
      className={mergeClassNames(
        "font-heading font-bold text-2xl text-black",
        className
      )}
      {...otherProps}
    >
      {children}
    </h4>
  );
};

export default H4;
