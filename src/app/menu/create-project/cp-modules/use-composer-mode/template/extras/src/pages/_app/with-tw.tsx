import React from "react";
import { Outlet } from "react-router-dom";

import "~/styles/globals.css";

export default function TailwindLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#2e026d] to-[#15162c]">
      <Outlet />
    </div>
  );
}
