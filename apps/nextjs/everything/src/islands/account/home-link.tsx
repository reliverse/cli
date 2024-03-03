"use client";

import type { ComponentPropsWithoutRef, FC } from "react";

import { TextLink } from "./text-link";

export const HomeLink: FC<
  Omit<ComponentPropsWithoutRef<typeof TextLink>, "href">
  // @ts-expect-error ⚠️ 1.2.5
> = ({ className, children, ...props }) => {
  return (
    // @ts-expect-error ⚠️ 1.2.5
    <TextLink href="/" {...props}>
      {children}
    </TextLink>
  );
};
