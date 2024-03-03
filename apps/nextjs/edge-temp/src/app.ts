/**
 * To reduce the number of config files, we aim to combine everything into a single file.
 * Materials about @satisfies: https://youtu.be/49gHWuepxxE, https://youtu.be/G1RtAmI0-vc
 */

import type { FooterItem, MainMenuItem } from "~/types";
import { networks, type Network } from "~/utils/meta/socials";

export const appts = {
  name: "Reliverse",
  debug: false,
  social: networks({
    youtube: "@bleverse_com",
    discord: "Pb8uKbwpsJ",
    facebook: "groups/bleverse",
    twitter: "blefnk",
    github: "blefnk",
  }),
};

export default appts;

const links = {
  twitter: "https://x.com/blefnk",
  github: "https://github.com/blefnk/reliverse",
  githubAccount: "https://github.com/blefnk",
  discord: "https://discord.gg/Pb8uKbwpsJ",
  facebook: "https://facebook.com/groups/bleverse",
};

export const contactConfig = {
  email: "blefnk@gmail.com",
};

export const REPOSITORY_OWNER = "blefnk";
export const REPOSITORY_NAME = "Reliverse";
export const REPOSITORY_URL = `https://github.com/${REPOSITORY_OWNER}/${REPOSITORY_NAME}`;
export const DISCORD_URL = "https://discord.gg/Pb8uKbwpsJ";
export const baseUrl = "https://reliverse.bleverse.com";

export const BRAND_NAME = "Reliverse";
export const BRAND_DESCRIPTION =
  "Next.js 13 free store and dashboard template. It helps you build great eCommerce and SaaS apps faster than ever. Get it now!";

export const OWNER_ROLE = "owner";
export const ADMIN_ROLE = "admin";
export const MEMBER_ROLE = "member";

export const TRIAL_LENGTH_IN_DAYS = 7;
export const ROLES = [OWNER_ROLE, ADMIN_ROLE, MEMBER_ROLE] as const;

export const settings = {
  internationalizationEnabled: true,
  themeToggleEnabled: true,
};

export const siteConfig = {
  name: "Reliverse",
  shortName: "Reliverse",
  author: "Bleverse",
  description:
    "NextJS 13 free starter: store, landing, dashboard. It helps you build great eCommerce and SaaS apps faster than ever. Get it!",
  company: {
    name: "Bleverse",
    link: "https://bleverse.com",
    email: "blefnk@gmail.com",
    twitter: "@blefnk",
  },
  handles: {
    twitter: "@blefnk",
  },
  keywords: [
    "App Router",
    "Blefonix",
    "Bleverse",
    "Drizzle Orm",
    "Landing Page",
    "Next.js 13.5",
    "Nextjs",
    "Open Source",
    "Parallel Routes",
    "PostgreSQL",
    "Radix Ui",
    "React",
    "Reliverse",
    "Server Actions",
    "Server Components",
    "Shadcn/UI",
    "Starter",
    "Stripe",
    "T3 Stack",
    "Tailwind Css",
    "Template",
    "Tools",
    "Utils",
  ],
  url: {
    base: baseUrl,
    author: REPOSITORY_OWNER,
  },
  ogImage: `${baseUrl}/og-image.png`,
  mainNav: [
    {
      title: "Lobby",
      items: [
        {
          title: "Products",
          href: "/products",
          description: "All the products we have to offer.",
          items: [],
        },
        {
          title: "Build a Look",
          href: "/custom/clothing",
          description: "Build your own custom clothes.",
          items: [],
        },
        {
          title: "Blog",
          href: "/blog",
          description: "Read our latest blog posts.",
          items: [],
        },
      ],
    },
  ] satisfies MainMenuItem[],
  links,
  footerNav: [
    {
      title: "Bleverse",
      items: [
        {
          title: "Community",
          href: "https://bleverse.com",
          external: true,
        },
        {
          title: "MF Piano",
          href: "https://mfpiano.org",
          external: true,
        },
        {
          title: "Peresfer",
          href: "https://peresfer.com",
          external: true,
        },
        {
          title: "Reliverse",
          href: "https://reliverse.bleverse.com",
          external: true,
        },
      ],
    },
    {
      title: "Help",
      items: [
        {
          title: "Contact",
          href: "/contact",
          external: false,
        },
        {
          title: "Privacy",
          href: "/privacy",
          external: false,
        },
        {
          title: "Terms",
          href: "/terms",
          external: false,
        },
        {
          title: "About",
          href: "/about",
          external: false,
        },
      ],
    },
    {
      title: "Social",
      items: [
        {
          title: "Facebook",
          href: links.facebook,
          external: true,
        },
        {
          title: "Discord",
          href: links.discord,
          external: true,
        },
        {
          title: "Twitter",
          href: links.twitter,
          external: true,
        },
        {
          title: "Github",
          href: links.githubAccount,
          external: true,
        },
      ],
    },
    {
      title: "Github",
      items: [
        {
          title: "Nomaders",
          href: "https://github.com/blefnk/nomaders",
          external: true,
        },
        {
          title: "Reliverse",
          href: "https://github.com/blefnk/reliverse",
          external: true,
        },
        {
          title: "Reliverse",
          href: "https://github.com/blefnk/reliverse",
          external: true,
        },
        {
          title: "Utilities",
          href: "https://github.com/blefnk/utils",
          external: true,
        },
      ],
    },
  ] satisfies FooterItem[],
};

export type SiteConfig = typeof siteConfig;

export const featureCards: ContentSection = {
  header: `Powered by`,
  subheader: `What Makes Reliverse Possible`,
  content: [
    {
      text: `Next.js`,
      subtext: `The React Framework`,
    },
    {
      text: `shadcn/ui`,
      subtext: `Beautifully Designed Components`,
    },
    {
      text: `Vercel`,
      subtext: `Develop. Preview. Ship.`,
    },
  ],
};

export const features: ContentSection = {
  header: `Features`,
  subheader: `Why You Need to Download Reliverse`,
  content: [
    {
      text: `SEO Optimized`,
      subtext: `Improved website visibility on search engines`,
    },
    {
      text: `Highly Performant`,
      subtext: `Fast loading times and smooth performance`,
    },
    {
      text: `Easy Customization`,
      subtext: `Change your content and layout with little effort`,
    },
  ],
};

export interface Config {
  social: Network[];
  name: string;
}

export interface ContactConfig {
  email: string;
}

export interface Settings {
  themeToggleEnabled: boolean;
}

export interface Layout {
  featureCards: string;
  headers: {
    featureCards: string;
    features: string;
  };
}

export interface Content {
  text: string;
  subtext: string;
  image?: string;
}

export interface ContentSection {
  header: string;
  subheader: string;
  image?: string;
  content: Content[];
}
