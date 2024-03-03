"use client";

import { forwardRef, type ComponentPropsWithoutRef } from "react";
import clsx from "clsx";

import { Link } from "~/navigation";

export const TextLink = forwardRef<
  HTMLAnchorElement,
  // @ts-expect-error ⚠️ 1.2.5
  ComponentPropsWithoutRef<typeof Link>
  // @ts-expect-error ⚠️ 1.2.5
>(({ className, children, ...props }, ref) => {
  return (
    // @ts-expect-error ⚠️ 1.2.5
    <Link
      ref={ref}
      className={clsx("text-blue-600 hover:underline", className)}
      {...props}
    >
      {children}
    </Link>
  );
});
