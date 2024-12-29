import type { ServiceKey } from "./keys.js";

import { KeyVars } from "./keys.js";
import { generateSecureString } from "./secureString.js";

export type KnownService = {
  name: string;
  dashboardUrl?: string;
  keys: ServiceKey[];
};

export const KNOWN_SERVICES: Record<string, KnownService> = {
  GENERAL: {
    name: "General",
    keys: [
      {
        key: KeyVars.NEXT_PUBLIC_APP_URL,
        defaultValue: "http://localhost:3000",
        instruction:
          "The public URL where your app will be hosted. Use localhost:3000 for development.",
      },
    ],
  },
  DATABASE: {
    name: "Database",
    keys: [
      {
        key: KeyVars.DATABASE_URL,
        type: "database",
        instruction:
          "For Neon, create a new project there and copy the connection string. Should start with: postgresql://",
      },
    ],
    dashboardUrl: "https://neon.tech",
  },
  CLERK: {
    name: "Clerk",
    keys: [
      {
        key: KeyVars.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
        instruction:
          "- Your Clerk publishable key starting with 'pk_test_' or 'pk_live_'\n- If you already have an account, you can easily find it here: https://clerk.com/docs/quickstarts/nextjs",
      },
      {
        key: KeyVars.CLERK_SECRET_KEY,
        instruction:
          "- Your Clerk secret key starting with 'sk_test_' or 'sk_live_'\n- If you already have an account, you can easily find it here: https://clerk.com/docs/quickstarts/nextjs",
      },
      {
        key: KeyVars.CLERK_ENCRYPTION_KEY,
        defaultValue: generateSecureString({
          charset: "alphanumeric",
          purpose: "encryption-key",
        }),
        hidden: true,
      },
    ],
    dashboardUrl: "https://clerk.com",
  },
  STRIPE: {
    name: "Stripe",
    keys: [
      {
        key: KeyVars.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
        instruction:
          "- Developers > API keys > Publishable key\n- Starts with 'pk_test_' or 'pk_live_'",
      },
      {
        key: KeyVars.STRIPE_API_KEY,
        instruction:
          "- Developers > API keys > Secret key\n- Starts with 'sk_test_' or 'sk_live_'",
      },
      {
        key: KeyVars.STRIPE_WEBHOOK_SECRET,
        instruction:
          "Your Stripe webhook signing secret starting with 'whsec_'",
        defaultValue: "whsec_1234567890",
      },
      {
        key: KeyVars.STRIPE_PRO_MONTHLY_PRICE_ID,
        instruction:
          "The price ID for your monthly pro plan starting with 'price_'",
        defaultValue: "price_1234567890",
      },
    ],
    dashboardUrl: "https://dashboard.stripe.com/test/apikeys",
  },
  UPLOADTHING: {
    name: "Uploadthing",
    keys: [
      {
        key: KeyVars.UPLOADTHING_TOKEN,
        instruction: "Your Uploadthing app token from the dashboard",
      },
      {
        key: KeyVars.UPLOADTHING_SECRET,
        instruction:
          "Your Uploadthing secret key from the dashboard.\nStarts with 'sk_live_'",
      },
    ],
    dashboardUrl: "https://uploadthing.com/dashboard",
  },
  RESEND: {
    name: "Resend",
    keys: [
      {
        key: KeyVars.RESEND_API_KEY,
        instruction: "Your Resend API key starting with 're_'",
      },
      {
        key: KeyVars.EMAIL_FROM_ADDRESS,
        type: "email",
        defaultValue: "onboarding@resend.dev",
        instruction: "The email address you want to send emails from",
      },
    ],
    dashboardUrl: "https://resend.com/api-keys",
  },
  AUTHJS: {
    name: "Auth.js",
    keys: [
      {
        key: KeyVars.AUTH_SECRET,
        defaultValue: generateSecureString({
          charset: "alphanumeric",
          purpose: "auth-secret",
        }),
        hidden: true,
      },
    ],
  },
};
