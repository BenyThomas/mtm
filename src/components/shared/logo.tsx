import { cn } from "@/lib/utils";
import React from "react";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const Logo = ({ className, size = "md" }: LogoProps) => {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-9 h-9",
    lg: "w-12 h-12",
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center bg-black rounded-full shadow-lg",
        className,
        sizeClasses[size]
      )}
    >
      <span className="text-white font-bold text-xl">K</span>
    </div>
  );
};

export default Logo;
