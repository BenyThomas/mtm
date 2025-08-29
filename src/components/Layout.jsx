import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import Breadcrumbs from './Breadcrumbs';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '🏠', end: true },
  { to: '/clients', label: 'Clients', icon: '👤' },
  { to: '/loans', label: 'Loans', icon: '💳' },
  { to: '/loan-products', label: 'Loan Products', icon: '🧩' },
  { to: '/offices', label: 'Offices', icon: '🏢' },
  { to: '/staff', label: 'Staff', icon: '🧑‍💼' },
  { to: '/reports', label: 'Reports', icon: '📊' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

const configGroup = {
  key: 'config',
  label: 'Config',
  icon: '🛠️',
  children: [
    { to: '/accounting/journal-entries', label: 'Journals', icon: '📘' },
    { to: '/accounting/gl-accounts', label: 'GL Accounts', icon: '🧾' },
    { to: '/accounting/financial-activity-mappings', label: 'FA ↔ GL Mapping', icon: '🔗' },
    { to: '/accounting/provisioning', label: 'Provisioning', icon: '🧮' },
    { to: '/accounting/accounting-rules', label: 'Accounting Rules', icon: '📐' },
    { to: '/config/account-number-formats', label: 'Account # Formats', icon: '🔢' },
    { to: '/config/business-dates', label: 'Business Dates', icon: '📆' },
    { to: '/audits', label: 'Audits', icon: '🧾' },
    { to: '/tools/batch', label: 'Batch API', icon: '📦' },
    { to: '/config/codes', label: 'Codes', icon: '🏷️' },
    { to: '/config/external-services', label: 'External Services', icon: '🌐' },
    { to: '/config/global-config', label: 'Global Config', icon: '🌍' },
    { to: '/config/datatables', label: 'Data Tables', icon: '🗄️' },
    { to: '/config/entity-datatable-checks', label: 'Entity Datatable Checks', icon: '✅' },
    { to: '/config/reports', label: 'Reports (Admin)', icon: '📑' },
    { to: '/config/external-events', label: 'External Events', icon: '📡' },
    { to: '/config/hooks', label: 'Hooks', icon: '🪝' },
    { to: '/config/instance-mode', label: 'Instance Mode', icon: '🧭' },
    { to: '/config/jobs', label: 'Scheduler Jobs', icon: '⏱️' },
    { to: '/config/report-mailing-jobs', label: 'Report Mailing Jobs', icon: '📧' },
    { to: '/config/external-asset-owners', label: 'External Asset Owners', icon: '🏦' },
    { to: '/config/eao-loan-product-attributes', label: 'EAO Loan Product Attr', icon: '🧩' },
    { to: '/config/holidays', label: 'Holidays', icon: '🎌' },
    { to: '/config/currencies', label: 'Currencies', icon: '💱' },

  ],
};

const Layout = () => {
  const { pathname } = useLocation();

  // Sidebar open state (mobile)
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const toggleSidebar = useCallback(() => setSidebarOpen((s) => !s), []);

  // Theme
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Persisted open/closed groups
  const [openGroups, setOpenGroups] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('nav_groups_open') || '{}');
    } catch {
      return {};
    }
  });
  const setGroupOpen = (key, open) => {
    setOpenGroups((prev) => {
      const next = { ...prev, [key]: open };
      localStorage.setItem('nav_groups_open', JSON.stringify(next));
      return next;
    });
  };
  const toggleGroup = (key) => setGroupOpen(key, !(openGroups[key]));

  // Auto-open config when on a child route
  const hasActiveConfigChild = useMemo(
      () => configGroup.children.some((c) => pathname.startsWith(c.to)),
      [pathname]
  );
  useEffect(() => {
    if (hasActiveConfigChild) setGroupOpen(configGroup.key, true);
  }, [hasActiveConfigChild]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    closeSidebar();
  }, [pathname, closeSidebar]);

  // ESC closes mobile sidebar
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
      <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        {/* Skip to content */}
        <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:top-2 focus:left-2 focus:px-3 focus:py-2 focus:rounded-md focus:bg-primary-600 focus:text-white"
        >
          Skip to content
        </a>

        {/* Mobile overlay */}
        <div
            className={`fixed inset-0 bg-black/40 transition-opacity md:hidden ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={closeSidebar}
            aria-hidden="true"
        />

        {/* Sidebar */}
        <aside
            id="sidebar"
            className={`fixed z-40 inset-y-0 left-0 w-64 transform md:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          transition-transform duration-200 ease-out
          bg-white/90 dark:bg-gray-800/70 backdrop-blur border-r border-gray-200 dark:border-gray-700
          flex flex-col`}
            aria-label="Primary"
        >
          {/* Brand */}
          <div className="h-16 shrink-0 flex items-center px-4 border-b border-gray-200 dark:border-gray-700">
            <div className="text-lg font-bold truncate">Money Trust</div>
          </div>

          {/* Scrollable nav area (fills remaining height) */}
          <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1 pb-6">
            <div className="p-3 space-y-1">
              {/* Top-level items */}
              {navItems.map((n) => (
                  <NavLink
                      key={n.to}
                      to={n.to}
                      end={n.end}
                      className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2 rounded-md transition
                  focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600
                  ${isActive
                              ? 'bg-primary-600 text-white'
                              : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100/60 dark:hover:bg-gray-700/60'}`
                      }
                  >
                    <span aria-hidden="true">{n.icon}</span>
                    <span className="truncate">{n.label}</span>
                  </NavLink>
              ))}

              {/* Divider */}
              <div className="mt-3 mb-1 h-px bg-gray-200 dark:bg-gray-700" />

              {/* Config group — no max-height cap; lets the sidebar scroll naturally */}
              <button
                  type="button"
                  onClick={() => toggleGroup(configGroup.key)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition
                text-gray-700 dark:text-gray-200 hover:bg-gray-100/60 dark:hover:bg-gray-700/60`}
                  aria-expanded={!!openGroups[configGroup.key]}
                  aria-controls="config-group"
              >
              <span className="flex items-center gap-3">
                <span aria-hidden="true">{configGroup.icon}</span>
                <span className="font-medium">{configGroup.label}</span>
              </span>
                <span className={`transform transition ${openGroups[configGroup.key] ? 'rotate-90' : ''}`}>▸</span>
              </button>

              <div
                  id="config-group"
                  className={`${openGroups[configGroup.key] ? 'block' : 'hidden'}`}
              >
                <div className="mt-1 pl-6 space-y-1">
                  {configGroup.children.map((child) => (
                      <NavLink
                          key={child.to}
                          to={child.to}
                          className={({ isActive }) =>
                              `flex items-center gap-3 px-3 py-2 rounded-md transition
                      focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600
                      ${isActive
                                  ? 'bg-primary-600 text-white'
                                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100/60 dark:hover:bg-gray-700/60'}`
                          }
                      >
                        <span aria-hidden="true">{child.icon}</span>
                        <span className="truncate">{child.label}</span>
                      </NavLink>
                  ))}
                </div>
              </div>
            </div>
          </nav>
        </aside>

        {/* Main column */}
        <div className="flex-1 flex flex-col md:ml-64">
          {/* Top bar */}
          <header className="h-16 sticky top-0 z-30 bg-white/80 dark:bg-gray-800/60 backdrop-blur border-b border-gray-200 dark:border-gray-700">
            <div className="h-full flex items-center justify-between px-3 md:px-6">
              <div className="flex items-center gap-2">
                <button
                    className="md:hidden p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={toggleSidebar}
                    aria-label="Toggle Sidebar"
                    aria-controls="sidebar"
                    aria-expanded={sidebarOpen}
                >
                  ☰
                </button>
                <div className="hidden md:flex items-center gap-1">
                  <NavLink
                      to="/offices"
                      className={({ isActive }) =>
                          `px-3 py-1.5 rounded-md text-sm transition
                    ${isActive
                              ? 'bg-primary-600 text-white'
                              : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`
                      }
                  >
                    Offices
                  </NavLink>
                  <NavLink
                      to="/staff"
                      className={({ isActive }) =>
                          `px-3 py-1.5 rounded-md text-sm transition
                    ${isActive
                              ? 'bg-primary-600 text-white'
                              : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`
                      }
                  >
                    Staff
                  </NavLink>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                    onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
                    className="px-3 py-1.5 rounded-md text-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                    aria-label="Toggle Theme"
                >
                  {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
                </button>
              </div>
            </div>
          </header>

          {/* Page content */}
          <main id="main-content" className="p-4 md:p-6 space-y-4">
            <Breadcrumbs />
            <Outlet />
          </main>
        </div>
      </div>
  );
};

export default Layout;
