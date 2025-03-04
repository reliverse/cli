import { Type, type Static } from "@sinclair/typebox";

export const keyTypeSchema = Type.Union([
  Type.Literal("string"),
  Type.Literal("email"),
  Type.Literal("password"),
  Type.Literal("number"),
  Type.Literal("boolean"),
  Type.Literal("database"),
]);

export const keyVarsSchema = Type.Union([
  Type.Literal("NEXT_PUBLIC_APP_URL"),
  Type.Literal("DATABASE_URL"),
  Type.Literal("AUTH_SECRET"),
  Type.Literal("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"),
  Type.Literal("CLERK_SECRET_KEY"),
  Type.Literal("CLERK_ENCRYPTION_KEY"),
  Type.Literal("UPLOADTHING_TOKEN"),
  Type.Literal("UPLOADTHING_SECRET"),
  Type.Literal("RESEND_API_KEY"),
  Type.Literal("EMAIL_FROM_ADDRESS"),
  Type.Literal("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"),
  Type.Literal("STRIPE_API_KEY"),
  Type.Literal("STRIPE_WEBHOOK_SECRET"),
  Type.Literal("STRIPE_PRO_MONTHLY_PRICE_ID"),
]);

export const defaultValues = Type.Union([
  Type.Literal("http://localhost:3000"),
  Type.Literal("onboarding@resend.dev"),
  Type.Literal("pk_test_"),
  Type.Literal("postgresql://postgres:postgres@localhost:5432/myapp"),
  Type.Literal("price_"),
  Type.Literal("re_"),
  Type.Literal("generate-64-chars"),
  Type.Literal("replace-me-with-token-from-dashboard"),
  Type.Literal("sk_live_"),
  Type.Literal("sk_test_"),
  Type.Literal("ut_app_"),
  Type.Literal("whsec_"),
]);

export const serviceKeySchema = Type.Object({
  key: keyVarsSchema,
  type: keyTypeSchema,
  instruction: Type.String(),
  defaultValue: defaultValues,
  optional: Type.Boolean({ default: false }),
});

export const dashboards = Type.Union([
  Type.Literal("none"),
  Type.Literal("https://clerk.com"),
  Type.Literal("https://neon.tech"),
  Type.Literal("https://dashboard.stripe.com"),
  Type.Literal("https://uploadthing.com/dashboard"),
  Type.Literal("https://resend.com/api-keys"),
  Type.Literal("https://dashboard.stripe.com/test/apikeys"),
]);

export const knownServiceSchema = Type.Object({
  name: Type.String(),
  dashboardUrl: dashboards,
  keys: Type.Array(serviceKeySchema),
});

export type KeyType = Static<typeof keyTypeSchema>;
export type KnownService = Static<typeof knownServiceSchema>;

export const KNOWN_SERVICES: Record<string, KnownService> = {
  GENERAL: {
    name: "General",
    dashboardUrl: "none",
    keys: [
      {
        key: "NEXT_PUBLIC_APP_URL",
        type: "string",
        instruction:
          "The public URL where your app will be hosted. Use http://localhost:3000 for development.",
        defaultValue: "http://localhost:3000",
        optional: true,
      },
    ],
  },
  DATABASE: {
    name: "Database",
    dashboardUrl: "https://neon.tech",
    keys: [
      {
        key: "DATABASE_URL",
        type: "database",
        instruction:
          "For Neon, create a new project there and copy the connection string. Should start with: postgresql://",
        defaultValue: "postgresql://postgres:postgres@localhost:5432/myapp",
        optional: false,
      },
    ],
  },
  CLERK: {
    name: "Clerk",
    keys: [
      {
        key: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
        type: "string",
        instruction:
          "- Your Clerk publishable key starting with 'pk_test_' or 'pk_live_'\n- If you already have an account, you can easily find it here: https://clerk.com/docs/quickstarts/nextjs",
        defaultValue: "pk_test_",
        optional: false,
      },
      {
        key: "CLERK_SECRET_KEY",
        type: "string",
        instruction:
          "- Your Clerk secret key starting with 'sk_test_' or 'sk_live_'\n- If you already have an account, you can easily find it here: https://clerk.com/docs/quickstarts/nextjs",
        defaultValue: "sk_test_",
        optional: false,
      },
      {
        key: "CLERK_ENCRYPTION_KEY",
        type: "string",
        instruction:
          "Your Clerk encryption key (must be a secure random string). Generate it on your own or via custom scripts if needed.",
        defaultValue: "generate-64-chars",
        optional: true,
      },
    ],
    dashboardUrl: "https://clerk.com",
  },
  STRIPE: {
    name: "Stripe",
    keys: [
      {
        key: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
        type: "string",
        instruction:
          "- Developers > API keys > Publishable key\n- Starts with 'pk_test_' or 'pk_live_'",
        defaultValue: "pk_test_",
        optional: false,
      },
      {
        key: "STRIPE_API_KEY",
        type: "string",
        instruction:
          "- Developers > API keys > Secret key\n- Starts with 'sk_test_' or 'sk_live_'",
        defaultValue: "sk_test_",
        optional: false,
      },
      {
        key: "STRIPE_WEBHOOK_SECRET",
        type: "string",
        instruction:
          "Your Stripe webhook signing secret starting with 'whsec_'",
        defaultValue: "whsec_",
        optional: true,
      },
      {
        key: "STRIPE_PRO_MONTHLY_PRICE_ID",
        type: "string",
        instruction:
          "The price ID for your monthly pro plan starting with 'price_'",
        defaultValue: "price_",
        optional: true,
      },
    ],
    dashboardUrl: "https://dashboard.stripe.com/test/apikeys",
  },
  UPLOADTHING: {
    name: "Uploadthing",
    keys: [
      {
        key: "UPLOADTHING_TOKEN",
        type: "string",
        instruction: "Your Uploadthing app token from the dashboard",
        defaultValue: "replace-me-with-token-from-dashboard",
        optional: false,
      },
      {
        key: "UPLOADTHING_SECRET",
        type: "string",
        instruction:
          "Your Uploadthing secret key from the dashboard.\nStarts with 'sk_live_'",
        defaultValue: "sk_live_",
        optional: false,
      },
    ],
    dashboardUrl: "https://uploadthing.com/dashboard",
  },
  RESEND: {
    name: "Resend",
    keys: [
      {
        key: "RESEND_API_KEY",
        type: "string",
        instruction: "Your Resend API key starting with 're_'",
        defaultValue: "re_",
        optional: false,
      },
      {
        key: "EMAIL_FROM_ADDRESS",
        instruction: "The email address you want to send emails from",
        type: "email",
        defaultValue: "onboarding@resend.dev",
        optional: true,
      },
    ],
    dashboardUrl: "https://resend.com/api-keys",
  },
  AUTHJS: {
    name: "Auth.js",
    dashboardUrl: "none",
    keys: [
      {
        key: "AUTH_SECRET",
        type: "string",
        instruction:
          "The secret key used for Auth.js sessions. Generate it on your own or via custom scripts if needed.",
        defaultValue: "generate-64-chars",
        optional: false,
      },
    ],
  },
} as const;
