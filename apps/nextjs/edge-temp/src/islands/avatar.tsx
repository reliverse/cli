/* eslint-disable react/display-name */
/* eslint-disable @next/next/no-img-element */
"use client";

import React, { forwardRef, useEffect, useState } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import cn, { type ClassValue } from "~/types";

export type Maybe<T> = T | undefined | null;

const placeHolderVariants = cva("overflow-clip text-center select-none", {
  variants: {
    size: {
      lg: ["text-lg"],
      md: ["text-sm"],
      sm: ["text-sm"],
      xlg: ["text-lg"],
      xs: ["text-xs"],
    },
  },
});

export const avatarVariants = cva(
  "relative flex items-center justify-center overflow-hidden border-width-2",
  {
    defaultVariants: {
      backgroundColor: "gray",
      border: false,
      shape: "rounded",
      size: "sm",
    },
    variants: {
      backgroundColor: {
        gray: "bg-gray-300 dark:bg-gray-600",
      },
      border: {
        false: [],
        true: [],
      },
      shape: {
        rounded: "rounded-full",
        square: "",
      },
      size: {
        lg: ["h-24 w-24"],
        md: ["h-16 w-16"],
        sm: ["h-12 w-12"],
        xlg: ["h-32 w-32"],
        xs: ["h-8 w-8"],
      },
    },
  },
);

export interface AvatarProps
  extends Omit<
      React.HTMLAttributes<HTMLDivElement>,
      "color" | "className" | "placeholder"
    >,
    VariantProps<typeof avatarVariants> {
  className?: ClassValue;
  imgClassName?: ClassValue;
  imgProps?: Omit<React.HTMLAttributes<HTMLImageElement>, "src" | "className">;
  placeholder?: Maybe<React.ReactNode>;
  src?: Maybe<string>;
}

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>((props, ref) => {
  const {
    border = false,
    backgroundColor,

    imgClassName,
    imgProps,
    size,
    shape,
    src,
    placeholder,
    ...divProps
  } = props;
  const divClassNames = avatarVariants({
    backgroundColor,
    border,
    shape,
    size,
  });
  const [showPlaceholder, setShowPlaceholder] = useState(!src);
  useEffect(() => {
    setShowPlaceholder(!src);
  }, [src]);

  return (
    <div {...divProps} className={divClassNames} ref={ref}>
      {src && (
        <img
          aria-label="Avatar photo"
          {...imgProps}
          className={cn(["h-full w-full object-cover"], imgClassName)}
          src={src}
          onLoad={() => {
            setShowPlaceholder(false);
          }}
          onError={() => {
            setShowPlaceholder(true);
          }}
        />
      )}
      {showPlaceholder && (
        <div className={placeHolderVariants({ size })}>{placeholder}</div>
      )}
    </div>
  );
});
