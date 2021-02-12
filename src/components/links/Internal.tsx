import React, { ComponentProps } from "react";
import { Link } from "react-router-dom";
import { mergeClassNames } from "../../libs/components";

const InternalLink: React.FC<ComponentProps<Link>> = ({
  className = "",
  ...props
}) => {
  return (
    <Link
      className={mergeClassNames(
        "font-bold underline default-transition",
        className
      )}
      {...props}
    />
  );
};

export default InternalLink;
