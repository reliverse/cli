"use client";

import type * as LabelPrimitive from "@radix-ui/react-label";
import type {
	ControllerProps,
	FieldPath,
	FieldValues,
	UseFormProps,
} from "react-hook-form";
import type { ZodType } from "zod";

import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@packages/ui";
import { Slot } from "@radix-ui/react-slot";
import * as React from "react";
import {
	Controller,
	FormProvider,
	// eslint-disable-next-line perfectionist/sort-named-imports
	useForm as __useForm,
	useFormContext,
} from "react-hook-form";

import { Label } from "./label";

const useForm = <TSchema extends ZodType>(
	props: {
		schema: TSchema;
	} & Omit<UseFormProps<TSchema["_input"]>, "resolver">,
) => {
	const form = __useForm<TSchema["_input"]>({
		...props,
		resolver: zodResolver(props.schema, undefined),
	});

	return form;
};

const Form = FormProvider;

interface FormFieldContextValue<
	TFieldValues extends FieldValues = FieldValues,
	TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
	name: TName;
}

const FormFieldContext = React.createContext<FormFieldContextValue | null>(
	null,
);

const FormField = <
	TFieldValues extends FieldValues = FieldValues,
	TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
	...props
}: ControllerProps<TFieldValues, TName>) => {
	return (
		<FormFieldContext.Provider value={{ name: props.name }}>
			<Controller {...props} />
		</FormFieldContext.Provider>
	);
};

const useFormField = () => {
	const fieldContext = React.useContext(FormFieldContext);
	const itemContext = React.useContext(FormItemContext);
	const { formState, getFieldState } = useFormContext();

	if (!fieldContext) {
		throw new Error("useFormField should be used within <FormField>");
	}
	const fieldState = getFieldState(fieldContext.name, formState);

	const { id } = itemContext;

	return {
		formDescriptionId: `${id}-form-item-description`,
		formItemId: `${id}-form-item`,
		formMessageId: `${id}-form-item-message`,
		id,
		name: fieldContext.name,
		...fieldState,
	};
};

interface FormItemContextValue {
	id: string;
}

const FormItemContext = React.createContext<FormItemContextValue>(
	{} as FormItemContextValue,
);

const FormItem = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
	const id = React.useId();

	return (
		<FormItemContext.Provider value={{ id }}>
			<div className={cn("space-y-2", className)} ref={ref} {...props} />
		</FormItemContext.Provider>
	);
});
FormItem.displayName = "FormItem";

const FormLabel = React.forwardRef<
	React.ElementRef<typeof LabelPrimitive.Root>,
	React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => {
	const { error, formItemId } = useFormField();

	return (
		<Label
			className={cn(error && "text-destructive", className)}
			htmlFor={formItemId}
			ref={ref}
			{...props}
		/>
	);
});
FormLabel.displayName = "FormLabel";

const FormControl = React.forwardRef<
	React.ElementRef<typeof Slot>,
	React.ComponentPropsWithoutRef<typeof Slot>
>(({ ...props }, ref) => {
	const { error, formDescriptionId, formItemId, formMessageId } =
		useFormField();

	return (
		<Slot
			aria-describedby={
				!error
					? `${formDescriptionId}`
					: `${formDescriptionId} ${formMessageId}`
			}
			aria-invalid={!!error}
			id={formItemId}
			ref={ref}
			{...props}
		/>
	);
});
FormControl.displayName = "FormControl";

const FormDescription = React.forwardRef<
	HTMLParagraphElement,
	React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
	const { formDescriptionId } = useFormField();

	return (
		<p
			className={cn("text-[0.8rem] text-muted-foreground", className)}
			id={formDescriptionId}
			ref={ref}
			{...props}
		/>
	);
});
FormDescription.displayName = "FormDescription";

const FormMessage = React.forwardRef<
	HTMLParagraphElement,
	React.HTMLAttributes<HTMLParagraphElement>
>(({ children, className, ...props }, ref) => {
	const { error, formMessageId } = useFormField();
	const body = error ? String(error.message) : children;

	if (!body) {
		return null;
	}

	return (
		<p
			className={cn("text-[0.8rem] font-medium text-destructive", className)}
			id={formMessageId}
			ref={ref}
			{...props}
		>
			{body}
		</p>
	);
});
FormMessage.displayName = "FormMessage";

export {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
	useForm,
	useFormField,
};

export { useFieldArray } from "react-hook-form";
