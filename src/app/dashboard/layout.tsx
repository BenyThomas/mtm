import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import React, { Suspense } from "react";
import { Sidebar } from "@/components/shared/side-bar";
import LottieDisplay from "@/components/shared/lottie-display";
import { lotties } from "@/constants/assets";
import ErrorComponent from "./error";
import TopHeader from "@/components/shared/top-header";
import ProtectedRoute from "@/components/shared/ProtectedRoute";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <ErrorBoundary errorComponent={ErrorComponent}>
      <ProtectedRoute>
        <Suspense
          fallback={
            <LottieDisplay
              height={60}
              width={60}
              animationData={lotties.loadingSpinnerYellow}
            />
          }
        >
          <div className="h-screen flex overflow-hidden">
            <Sidebar />

            <div className="flex-1 overflow-y-auto">
              <TopHeader />

              <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-8">
                <main className="w-full">{children}</main>
              </div>
            </div>
          </div>
        </Suspense>
      </ProtectedRoute>
    </ErrorBoundary>
  );
};

export default DashboardLayout;
