import React, { SVGProps } from "react";
import { mergeClassNames } from "../../libs/components";
import { ReactComponent as LoaderImage } from "../../images/loader.svg";

const LoaderIcon: React.FC<SVGProps<SVGSVGElement>> = ({
  className = "",
  ...otherProps
}) => {
  return (
    <LoaderImage
      className={mergeClassNames("animate-spin", className)}
      {...otherProps}
    />
  );
};

export default LoaderIcon;
