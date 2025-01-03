import { QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import React from "react";
import { Outlet } from "react-router-dom";

import { queryClient } from "../../utils/api.js";

import "~/styles/globals.css";

export default function AuthTrpcLayout() {
  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <div>
          <Outlet />
        </div>
      </QueryClientProvider>
    </SessionProvider>
  );
}
