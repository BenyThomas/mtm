"use client";

import { useAuth } from "@/contexts/AuthContext";
import React from "react";
import { Button } from "../ui/button";
import { ThemeToggle } from "../theme-toggle";

const TopHeader = () => {
  const { user, logout } = useAuth();

  return (
    <header className="h-[64.5px] bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-5 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Welcome back,{" "}
          <span className="capitalize font-medium">
            {user.staffDisplayName || user.username}
          </span>
        </p>
      </div>

      <div className="flex items-center gap-5">
        <ThemeToggle isCollapsed={false} />
        <Button onClick={logout} variant="destructive" size="sm">
          Logout
        </Button>
      </div>
    </header>
  );
};

export default TopHeader;
