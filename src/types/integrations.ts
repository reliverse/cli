export type DatabaseProvider = "neon" | "railway";

export type SubOption = {
  label: string;
  value: string;
  providers?: DatabaseProvider[];
};

export type IntegrationOption = {
  label: string;
  value: string;
  subOptions?: SubOption[];
};

export type IntegrationCategory =
  | "database"
  | "payments"
  | "auth"
  | "email"
  | "styling"
  | "testing";

export type IntegrationOptions = Record<string, IntegrationOption[]>;
