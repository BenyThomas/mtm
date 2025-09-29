import React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import Skeleton from "./Skeleton";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, checking } = useAuth();
  const router = useRouter();

  if (checking) {
    return (
      <div className="p-6">
        <Skeleton height="2rem" />
        <Skeleton height="12rem" className="mt-4" />
      </div>
    );
  }

  if (!isAuthenticated) {
    router.replace("/login");
    return null;
  }

  return children;
};

export default ProtectedRoute;
