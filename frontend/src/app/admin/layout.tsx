'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AdminRoute } from '@/components/AdminRoute';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Package, 
  Tags, 
  ShoppingCart, 
  Archive, 
  Users, 
  BarChart3,
  Menu,
  X,
  Store,
  ChevronRight
} from 'lucide-react';

import { useAuthStore } from '@/store/useAuthStore';
import { ShieldAlert } from 'lucide-react';

const rolePermissions: Record<string, string[]> = {
  super_admin: ['/admin', '/admin/products', '/admin/categories', '/admin/orders', '/admin/inventory', '/admin/employees', '/admin/reports'],
  inventory_manager: ['/admin', '/admin/products', '/admin/inventory'],
  order_dispatcher: ['/admin', '/admin/orders'],
  catalog_manager: ['/admin', '/admin/products', '/admin/categories'],
  analyst: ['/admin', '/admin/reports'],
};

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  inventory_manager: 'Inventory Manager',
  order_dispatcher: 'Order Dispatcher',
  catalog_manager: 'Catalog Manager',
  analyst: 'Business Analyst',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuthStore();
  const staffRole = user?.employee_role || 'super_admin';

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { href: '/admin/products', label: 'Products', icon: Package },
    { href: '/admin/categories', label: 'Categories', icon: Tags },
    { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
    { href: '/admin/inventory', label: 'Inventory', icon: Archive },
    { href: '/admin/employees', label: 'Employees', icon: Users },
    { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
  ];

  const allowedPaths = rolePermissions[staffRole] || ['/admin'];
  const visibleNavItems = navItems.filter((item) => allowedPaths.includes(item.href));

  const currentNav = navItems.find((item) => 
    item.exact ? pathname === item.href : pathname.startsWith(item.href)
  );

  // Skip the admin guard for the staff login page to prevent redirect loops
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  // Check if current route is authorized for this employee's role
  const isAuthorizedRoute = allowedPaths.some((allowed) => 
    allowed === '/admin' ? pathname === '/admin' : pathname.startsWith(allowed)
  );

  return (
    <AdminRoute>
      <div className="flex flex-col md:flex-row min-h-[calc(100vh-4rem)]">
        {/* Mobile Header Bar */}
        <div className="md:hidden flex items-center justify-between border-b bg-card px-4 py-3 sticky top-16 z-30 shadow-xs">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              className="h-9 w-9"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              <span className="text-muted-foreground">{roleLabels[staffRole] || 'Admin'}</span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{currentNav?.label || 'Console'}</span>
            </div>
          </div>
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 font-medium">
            <Store className="h-3.5 w-3.5" /> Storefront
          </Link>
        </div>

        {/* Mobile Backdrop & Drawer */}
        {mobileMenuOpen && (
          <div 
            className="md:hidden fixed inset-0 top-[calc(4rem+49px)] z-20 bg-background/80 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div 
              className="w-72 bg-card border-r h-full p-4 shadow-xl overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-3 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Management Portal
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {roleLabels[staffRole] || staffRole}
                </span>
              </div>
              <nav className="space-y-1">
                {visibleNavItems.map((item) => {
                  const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                        isActive 
                          ? 'bg-primary text-primary-foreground shadow-xs' 
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="pt-6 mt-6 border-t">
                <Link
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground rounded-md hover:bg-muted"
                >
                  <Store className="h-4 w-4" /> Exit to Storefront
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-64 border-r bg-muted/20 shrink-0 p-4">
          <div className="flex items-center justify-between px-3 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Admin Console
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {roleLabels[staffRole] || staffRole}
            </span>
          </div>
          <nav className="space-y-1.5 flex-1">
            {visibleNavItems.map((item) => {
              const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                    isActive 
                      ? 'bg-primary text-primary-foreground shadow-xs' 
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="pt-4 mt-auto border-t">
            <Link
              href="/"
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
            >
              <Store className="h-4 w-4" /> Back to Storefront
            </Link>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden min-w-0">
          {isAuthorizedRoute ? (
            children
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 border rounded-2xl bg-card shadow-xs">
              <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center mb-4">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold tracking-tight">Access Restricted</h2>
              <p className="text-sm text-muted-foreground max-w-md mt-1 mb-6">
                Your staff account (<strong>{roleLabels[staffRole] || staffRole}</strong>) does not have permission to view or manage the <strong>{currentNav?.label || 'requested'}</strong> module.
              </p>
              <Link
                href="/admin"
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
              >
                Return to Overview Dashboard
              </Link>
            </div>
          )}
        </main>
      </div>
    </AdminRoute>
  );
}
