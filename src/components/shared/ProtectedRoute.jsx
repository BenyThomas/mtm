"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import LoadingOverlay from "./loading-overlay";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, checking } = useAuth();
  const router = useRouter();

  if (checking) {
    return <LoadingOverlay />;
  }

  if (!isAuthenticated) {
    setTimeout(() => {
      router.replace("/");
    }, 500);
    return null;
  }

  return children;
};

export default ProtectedRoute;
