import { QueryClientProvider } from "@tanstack/react-query";
// @ts-expect-error TODO: fix ts
import routes from "~react-pages";
import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import { AuthProvider } from "./providers/auth.jsx";
import Root from "./root.jsx";
import { api, trpcClient, queryClient } from "./utils/api.js";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    children: routes,
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      {/* @ts-expect-error TODO: fix ts */}
      <api.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </api.Provider>
    </AuthProvider>
  </React.StrictMode>,
);
