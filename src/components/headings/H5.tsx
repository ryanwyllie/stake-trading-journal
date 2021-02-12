import React, { HTMLProps } from "react";
import { mergeClassNames } from "../../libs/components";

const H4: React.FC<HTMLProps<HTMLHeadingElement>> = ({
  className = "",
  children,
  ...otherProps
}) => {
  return (
    <h5
      className={mergeClassNames(
        "font-heading font-bold text-xl text-black",
        className
      )}
      {...otherProps}
    >
      {children}
    </h5>
  );
};

export default H4;
