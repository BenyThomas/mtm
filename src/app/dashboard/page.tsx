"use client";

// Force dynamic rendering
export const dynamic = "force-dynamic";

import { useAuth } from "@/contexts/AuthContext";
import { useClients, useOverdueLoans } from "@/hooks/queries/clients";
import { useLoans } from "@/hooks/queries/loans";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const { data: loans = [], isLoading: loansLoading } = useLoans();
  const { data: overdueLoans = [], isLoading: overdueLoading } =
    useOverdueLoans();

  const handleLogout = () => {
    logout();
  };

  // Calculate KPIs
  const activeClients = clients.length;
  const activeLoans = loans.length;
  const portfolioOutstanding = loans.reduce(
    (sum: number, loan: any) => sum + (loan.principalOutstanding || 0),
    0
  );

  // PAR>30 calculation
  const par30 =
    loans.length > 0
      ? (overdueLoans.filter((loan: any) => (loan.daysInArrears || 0) > 30)
          .length /
          loans.length) *
        100
      : 0;

  if (!mounted || clientsLoading || loansLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Dashboard
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Welcome back, {user.staffDisplayName || user.username}
              </p>
            </div>
            <Button onClick={handleLogout} variant="destructive" size="sm">
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-lg">👥</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Active Clients
                    </dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">
                      {activeClients}
                    </dd>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-lg">💳</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Active Loans
                    </dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">
                      {activeLoans}
                    </dd>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-lg">💰</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Portfolio Outstanding
                    </dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">
                      {portfolioOutstanding.toLocaleString()} TZS
                    </dd>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-lg">📊</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      PAR &gt; 30
                    </dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">
                      {par30.toFixed(2)}%
                    </dd>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-4">
              <Button onClick={() => router.push("/dashboard/clients")}>
                Manage Clients
              </Button>
              <Button
                variant="secondary"
                onClick={() => router.push("/dashboard/loans")}
              >
                Manage Loans
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard/reports")}
              >
                View Reports
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
              Recent Activity
            </h3>
            <div className="text-center py-10">
              <div className="text-3xl">📭</div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                No recent activity to display
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
