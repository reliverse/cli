import { SessionProvider } from "next-auth/react";
import React from "react";
import { Outlet } from "react-router-dom";

import "~/styles/globals.css";

export default function AuthLayout() {
  return (
    <SessionProvider>
      <div>
        <Outlet />
      </div>
    </SessionProvider>
  );
}
