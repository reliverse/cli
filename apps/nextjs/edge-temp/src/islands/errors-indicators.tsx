import { env } from "~/env.mjs";

interface ShowErrorsProps {
  hide?: boolean;
}

export function ShowErrors({ hide = false }: ShowErrorsProps) {
  const expectedVars = [
    "DISCORD_CLIENT_ID",
    "DISCORD_CLIENT_SECRET",
    "GITHUB_CLIENT_ID",
    "GITHUB_CLIENT_SECRET",
  ];
  const missingVars: string[] = [];

  expectedVars.forEach((envVar) => {
    if (!process.env[envVar]) {
      missingVars.push(envVar);
    }
  });

  const hasAnyAuthClientInfo =
    (env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET) ||
    (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);

  // Do not show the component if `hide` is true, no vars are missing,
  // or at least one pair of client ID and secret is specified.
  if (hide || missingVars.length === 0 || hasAnyAuthClientInfo) return null;

  return (
    <section>
      <div className="mt-6 flex flex-1 flex-wrap place-items-start gap-4 text-sm">
        <div className="flex-1">
          {missingVars.length > 0 ? (
            <>
              <h2 className="text-base">
                ⚠️ The following variables are missing:
                <br />{" "}
              </h2>
              <p className="mt-2 text-red-900 dark:text-red-400">
                {missingVars.map((varName, index) => (
                  <span
                    key={index}
                    className="font-mono text-base text-red-900 dark:text-red-400"
                  >
                    {varName}
                    {index < missingVars.length - 1 ? ", " : " "}
                  </span>
                ))}
              </p>
              <p className="text-muted-foreground mt-2">
                Verify their presence in your .env file (or in your deployment
                service).
              </p>
            </>
          ) : null}
          <p className="text-muted-foreground">
            <span className="font-bold">
              It is okay to specify only GitHub or Discord variables to unlock
              auth features.
            </span>{" "}
          </p>
          <p className="text-muted-foreground text-sm">
            The application will continue to function, but features related to
            the missing variables will be disabled.
          </p>
          <p className="text-muted-foreground text-sm">
            To suppress this warning, utilize {`<ShowErrors hide />`} in
            src/app/[locale]/layout.tsx, not recommended.
          </p>
        </div>
      </div>
    </section>
  );
}
