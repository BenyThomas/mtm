import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import React, { Suspense } from "react";
import { Sidebar } from "@/components/shared/side-bar";
import LottieDisplay from "@/components/shared/lottie-display";
import { lotties } from "@/constants/assets";
import ErrorComponent from "./error";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <ErrorBoundary errorComponent={ErrorComponent}>
      <Suspense
        fallback={
          <LottieDisplay
            height={60}
            width={60}
            animationData={lotties.loadingSpinnerWhite}
          />
        }
      >
        <div className="h-screen flex overflow-hidden">
          <Sidebar />

          <div className="flex-1 overflow-y-auto">
            <div className="container mx-auto max-w-7xl">
              <main className="w-full">{children}</main>
            </div>
          </div>
        </div>
      </Suspense>
    </ErrorBoundary>
  );
};

export default DashboardLayout;
