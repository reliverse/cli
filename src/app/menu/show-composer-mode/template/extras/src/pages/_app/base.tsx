import React from "react";
import { Outlet } from "react-router-dom";

import "~/styles/globals.css";

export default function BaseLayout() {
  return (
    <div>
      <Outlet />
    </div>
  );
}
