// import { Metadata } from "next";
// import { NextResponse, type NextRequest } from "next/server";
// import { type FileWithPath } from "react-dropzone";
// import { type z, type ZodIssue } from "zod";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// import type { storeSubscriptionPlans } from "~/server/config/subscriptions";
// import { type accounts, type Store } from "~/data/db/schema/postgres";
// import { IUser } from "~/data/routers/handlers/users";
// import { type userPrivateMetadataSchema } from "~/data/validations/auth";
// import type {
//   cartItemSchema,
//   cartLineItemSchema,
//   checkoutItemSchema,
// } from "~/data/validations/cart";
// import { type Icons } from "~/islands/icons";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export { ClassValue, cn, cn as classnames };

export default cn;

/**
 * =======================================================================
 * TYPES: MISCELLANEOUS
 * =======================================================================
 */

// export type Account = typeof accounts.$inferSelect;
// export type SubPlan = (typeof storeSubscriptionPlans)[number];
// export type PlanName = (typeof storeSubscriptionPlans)[number]["name"];

/**
 * =======================================================================
 * TYPES: RESPONSE
 * =======================================================================
 */

export interface ApiResponseError {
  ok: false;
  error: string;
  // issues?: ZodIssue[];
}

export interface ApiResponseSuccess<T> {
  ok: true;
  data: T;
}

export type ApiResponse<T> = ApiResponseSuccess<T> | ApiResponseError;

export interface NextRequestContext<T> {
  params: T;
}

/**
 * The Context parameter for route handlers, which is currently optional `params` object.
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/route#context-optional
 */
export interface NextRouteContext<T = undefined> {
  params: T;
}

/**
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/route
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/route#request-optional
 */
// export type NextRouteHandler<T = void, U = NextRouteContext> = (
//   request: NextRequest,
//   context: U,
// ) => NextResponse<T> | Promise<NextResponse<T>>;

/**
 * =======================================================================
 * TYPES: PROPS
 * =======================================================================
 */

export type WithChildren<T = unknown> = T & { children: React.ReactNode };

export interface LocaleLayoutParams {
  params: { locale: string };
}

// export interface NullLayoutParams {}

export interface GeneralShellParams {
  header?: React.ReactNode;
}

/**
 * =======================================================================
 * TYPES: API
 * =======================================================================
 */

// declare module "translate" {
//   export default function translate(
//     text: string,
//     options: {
//       from: string;
//       to: string;
//       cache?: number;
//       engine?: string;
//       key?: string;
//       url?: string;
//     },
//   ): string;
// }

/**
 * =======================================================================
 * TYPES: NAVIGATION
 * =======================================================================
 */

export interface NavItem {
  title: string;
  href?: string;
  disabled?: boolean;
  external?: boolean;
  // icon?: keyof typeof Icons;
  label?: string;
  description?: string;
}

export interface NavItemWithChildren extends NavItem {
  items: NavItemWithChildren[];
}

export interface NavItemWithOptionalChildren extends NavItem {
  items?: NavItemWithChildren[];
}

export interface FooterItem {
  title: string;
  items: {
    title: string;
    href: string;
    external?: boolean;
  }[];
}

export type MainMenuItem = NavItemWithOptionalChildren;

export type SidebarNavItem = NavItemWithChildren;

/**
 * =======================================================================
 * TYPES: USER
 * =======================================================================
 */

// export type UserRole = z.infer<typeof userPrivateMetadataSchema.shape.role>;

export interface Option {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
}

// export type FileWithPreview = FileWithPath & {
//   preview: string;
// };

export interface StoredFile {
  id: string;
  name: string;
  url: string;
}

export interface DataTableSearchableColumn<TData> {
  id: keyof TData;
  title: string;
}

export interface DataTableFilterableColumn<TData>
  extends DataTableSearchableColumn<TData> {
  options: Option[];
}

/**
 * =======================================================================
 * TYPES: STORE
 * =======================================================================
 */

// export interface CuratedStore {
//   id: Store["id"];
//   name: Store["name"];
//   description?: Store["description"];
//   stripeAccountId?: Store["stripeAccountId"];
//   productCount?: number;
// }

// export type CartItem = z.infer<typeof cartItemSchema>;

// export type CheckoutItem = z.infer<typeof checkoutItemSchema>;

// export type CartLineItem = z.infer<typeof cartLineItemSchema>;

export interface SubscriptionPlan {
  id: "starter" | "professional" | "enterprise";
  name: string;
  description: string;
  features: string[];
  stripePriceId: string;
  price: number;
}

export interface UserSubscriptionPlan extends SubscriptionPlan {
  stripeSubscriptionId?: string | null;
  stripeCurrentPeriodEnd?: string | null;
  stripeCustomerId?: string | null;
  isSubscribed: boolean;
  isCanceled: boolean;
  isActive: boolean;
}
