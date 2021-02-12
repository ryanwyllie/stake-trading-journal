import React, { HTMLProps } from "react";
import { mergeClassNames } from "../../libs/components";

const H4: React.FC<HTMLProps<HTMLHeadingElement>> = ({
  className = "",
  children,
  ...otherProps
}) => {
  return (
    <h6
      className={mergeClassNames(
        "font-heading font-bold text-lg text-black",
        className
      )}
      {...otherProps}
    >
      {children}
    </h6>
  );
};

export default H4;
