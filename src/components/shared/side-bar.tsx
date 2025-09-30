"use client";

import { useState } from "react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Menu,
  ChevronLeft,
  Users,
  CreditCard,
  BarChart3,
  Building2,
  UserCheck,
  Calendar,
  Flag,
  CalendarDays,
  Shield,
  Coins,
  Receipt,
  Calculator,
  Lock,
  TrendingUp,
  FileText,
  Link,
  Clock,
  RotateCcw,
  FileBarChart,
  History,
  TrendingDown,
  Archive,
  DollarSign,
  Currency,
  Tag,
  Paperclip,
  CheckSquare,
  Plug,
  Radio,
  Globe,
  Search,
  FileText as FileTextIcon,
  Compass,
  Clock as ClockIcon,
  Mail,
  Puzzle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import Logo from "./logo";
import { getCurrentYear } from "@/utils/helpers";

// Define navigation groups
const navigationGroups = [
  {
    title: "Main",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: Home },
      { name: "Clients", href: "/dashboard/clients", icon: Users },
      { name: "Loans", href: "/dashboard/loans", icon: CreditCard },
      { name: "Tellers", href: "/dashboard/tellers", icon: UserCheck },
      { name: "Charges", href: "/dashboard/products/charges", icon: Coins },
      { name: "Share Accounts", href: "/dashboard/shares", icon: DollarSign },
      { name: "Reports", href: "/dashboard/reports", icon: BarChart3 },
    ],
  },
  {
    title: "Organization",
    items: [
      { name: "Offices", href: "/dashboard/offices", icon: Building2 },
      { name: "Staff", href: "/dashboard/staff", icon: UserCheck },
      {
        name: "Business Dates",
        href: "/dashboard/config/business-dates",
        icon: Calendar,
      },
      { name: "Holidays", href: "/dashboard/config/holidays", icon: Flag },
      {
        name: "Working Days",
        href: "/dashboard/organization/working-days",
        icon: CalendarDays,
      },
      {
        name: "Collateral Catalog",
        href: "/dashboard/collateral-management",
        icon: Shield,
      },
    ],
  },
  {
    title: "Accounting",
    items: [
      {
        name: "GL Accounts",
        href: "/dashboard/accounting/gl-accounts",
        icon: Receipt,
      },
      {
        name: "Journal Entries",
        href: "/dashboard/accounting/journal-entries",
        icon: FileText,
      },
      {
        name: "Accounting Rules",
        href: "/dashboard/accounting/accounting-rules",
        icon: Calculator,
      },
      {
        name: "GL Closures",
        href: "/dashboard/accounting/closures",
        icon: Lock,
      },
      {
        name: "Provisioning Criteria",
        href: "/dashboard/accounting/provisioning-criteria",
        icon: TrendingUp,
      },
      {
        name: "FA ↔ GL Mapping",
        href: "/dashboard/accounting/financial-activity-mappings",
        icon: Link,
      },
      {
        name: "Run Accruals",
        href: "/dashboard/accounting/accruals",
        icon: Clock,
      },
      {
        name: "Account Transfers",
        href: "/dashboard/accounting/transfers",
        icon: RotateCcw,
      },
      {
        name: "Standing Instructions",
        href: "/dashboard/accounting/standing-instructions",
        icon: FileBarChart,
      },
      {
        name: "Standing Instr. History",
        href: "/dashboard/accounting/standing-instructions-history",
        icon: History,
      },
      {
        name: "Delinquency Ranges",
        href: "/dashboard/delinquency/ranges",
        icon: TrendingDown,
      },
      {
        name: "Delinquency Buckets",
        href: "/dashboard/delinquency/buckets",
        icon: Archive,
      },
    ],
  },
  {
    title: "Sys Config",
    items: [
      {
        name: "Currencies",
        href: "/dashboard/config/currencies",
        icon: Currency,
      },
      { name: "Codes", href: "/dashboard/config/codes", icon: Tag },
      {
        name: "Code Values",
        href: "/dashboard/config/code-values",
        icon: Paperclip,
      },
      {
        name: "Data Tables",
        href: "/dashboard/config/datatables",
        icon: CheckSquare,
      },
      {
        name: "Entity Datatable Checks",
        href: "/dashboard/config/entity-datatable-checks",
        icon: CheckSquare,
      },
      {
        name: "External Services",
        href: "/dashboard/config/external-services",
        icon: Plug,
      },
      {
        name: "External Events",
        href: "/dashboard/config/externalevents",
        icon: Radio,
      },
      {
        name: "Global Config",
        href: "/dashboard/config/global-config",
        icon: Globe,
      },
      { name: "Audits", href: "/dashboard/config/audits", icon: Search },
      {
        name: "Reports",
        href: "/dashboard/config/reports",
        icon: FileTextIcon,
      },
      { name: "Hooks", href: "/dashboard/config/hooks", icon: Puzzle },
      {
        name: "Instance Mode",
        href: "/dashboard/config/instance-mode",
        icon: Compass,
      },
      {
        name: "Scheduler Jobs",
        href: "/dashboard/config/jobs",
        icon: ClockIcon,
      },
      {
        name: "Report Mailing",
        href: "/dashboard/config/report-mailing-jobs",
        icon: Mail,
      },
      {
        name: "Entity Field Config",
        href: "/dashboard/config/field-config",
        icon: Puzzle,
      },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(["Main"]);

  const toggleGroup = (groupTitle: string) => {
    setExpandedGroups((prev) =>
      prev.includes(groupTitle)
        ? prev.filter((title) => title !== groupTitle)
        : [...prev, groupTitle]
    );
  };

  const NavGroupItem = ({ item }: { item: NavBarItemType }) => (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <NextLink
          href={item.href}
          className={cn(
            "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
            pathname === item.href
              ? "bg-blue-100 dark:bg-gray-800 text-blue-900 dark:text-white"
              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white hover:ease-in-out duration-150",
            isCollapsed && "justify-center px-2"
          )}
        >
          <item.icon className={cn("h-4 w-4", !isCollapsed && "mr-3")} />
          {!isCollapsed && <span>{item.name}</span>}
        </NextLink>
      </TooltipTrigger>
      {isCollapsed && (
        <TooltipContent side="right" className="flex items-center gap-4">
          {item.name}
        </TooltipContent>
      )}
    </Tooltip>
  );

  return (
    <div className="bg-white border-r border-gray-200 dark:bg-gray-900 dark:border-gray-700 overflow-y-auto">
      <TooltipProvider>
        <>
          <button
            className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-md shadow-md transition-colors"
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            aria-label="Toggle sidebar"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div
            className={cn(
              "h-full fixed inset-y-0 z-20 flex flex-col justify-between transition-all duration-300 ease-in-out lg:static",
              isCollapsed ? "w-14" : "w-56",
              isMobileOpen
                ? "translate-x-0"
                : "-translate-x-full lg:translate-x-0"
            )}
          >
            <div>
              <div className="border-b border-gray-200 dark:border-gray-700">
                <div
                  className={cn(
                    "flex h-16 items-center gap-2 px-4",
                    isCollapsed && "justify-center px-2"
                  )}
                >
                  {!isCollapsed && (
                    <NextLink
                      href="/"
                      className="h-full grid place-items-center"
                    >
                      <Logo size="md" />
                    </NextLink>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "ml-auto h-8 w-8 group rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors",
                      isCollapsed && "ml-0"
                    )}
                    onClick={() => setIsCollapsed(!isCollapsed)}
                  >
                    <ChevronLeft
                      className={cn(
                        "h-4 w-4 transition-transform text-blue-500 group-hover:text-blue-400 duration-150",
                        isCollapsed && "rotate-180"
                      )}
                    />
                    <span className="sr-only">
                      {isCollapsed ? "Expand" : "Collapse"} Sidebar
                    </span>
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto overflow-x-hidden">
                <nav className="flex-1 space-y-1 px-2 py-4">
                  {navigationGroups.map((group) => (
                    <div key={group.title} className="space-y-1">
                      {!isCollapsed && (
                        <button
                          onClick={() => toggleGroup(group.title)}
                          className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                        >
                          <span>{group.title}</span>
                          {expandedGroups.includes(group.title) ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                        </button>
                      )}
                      {expandedGroups.includes(group.title) && (
                        <div className="space-y-1">
                          {group.items.map((item) => (
                            <NavGroupItem key={item.name} item={item} />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </nav>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 p-2">
              <span className="text-xs text-gray-700 dark:text-gray-400">
                &copy; {getCurrentYear()} Kazy. All rights reserved.
              </span>
            </div>
          </div>
        </>
      </TooltipProvider>
    </div>
  );
}
