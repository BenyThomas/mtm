"use client";

import Lottie, { LottieComponentProps } from "lottie-react";

interface LottieProps extends LottieComponentProps {
  height?: number;
  width?: number;
}

const LottieDisplay = (props: LottieProps) => {
  const { height, width, ...rest } = props;

  const style = {
    height: height,
    width: width,
  };

  return <Lottie {...rest} style={{ ...style }} />;
};

export default LottieDisplay;
