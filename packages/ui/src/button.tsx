import type { VariantProps } from "class-variance-authority";

import { cn } from "@packages/ui";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import * as React from "react";

const buttonVariants = cva(
	"inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
	{
		defaultVariants: {
			size: "md",
			variant: "primary",
		},
		variants: {
			size: {
				icon: "size-9",
				lg: "h-10 rounded-md px-8",
				md: "h-9 px-4 py-2",
				sm: "h-8 rounded-md px-3 text-xs",
			},
			variant: {
				destructive:
					"bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
				ghost: "hover:bg-accent hover:text-accent-foreground",
				link: "text-primary underline-offset-4 hover:underline",
				outline:
					"border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
				primary:
					"bg-primary text-primary-foreground shadow hover:bg-primary/90",
				secondary:
					"bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
			},
		},
	},
);

interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof buttonVariants> {
	asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	({ asChild = false, className, size, variant, ...props }, ref) => {
		const Comp = asChild ? Slot : "button";
		return (
			<Comp
				className={cn(buttonVariants({ className, size, variant }))}
				ref={ref}
				{...props}
			/>
		);
	},
);
Button.displayName = "Button";

export { Button, buttonVariants };
