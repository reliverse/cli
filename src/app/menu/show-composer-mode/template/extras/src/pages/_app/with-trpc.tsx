import { QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { Outlet } from "react-router-dom";

import { queryClient } from "../../utils/api.js";

import "~/styles/globals.css";

export default function TrpcLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <div>
        <Outlet />
      </div>
    </QueryClientProvider>
  );
}
