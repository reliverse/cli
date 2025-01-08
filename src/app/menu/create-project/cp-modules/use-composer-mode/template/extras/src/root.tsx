import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";

import "./styles/globals.css";

export function Layout() {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>@reliverse/cli</title>
        <Meta />
        <Links />
      </head>
      <body className="font-sans">
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function Root() {
  return <Outlet />;
}
