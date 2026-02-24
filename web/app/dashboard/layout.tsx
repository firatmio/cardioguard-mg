"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Bell,
  Settings,
  LogOut,
  Heart,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/lib/firebase/hooks";
import { signOut } from "@/lib/firebase/auth";
import { useState } from "react";
import styles from "./layout.module.css";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Patients", href: "/dashboard/patients", icon: Users },
  { label: "Alerts", href: "/dashboard/alerts", icon: Bell },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  const handleSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

  // While auth is loading
  if (loading) {
    return (
      <div className={styles.loadingPage}>
        <div className={styles.spinner} />
      </div>
    );
  }

  // Unauthorized
  if (!user) return null;

  // Build breadcrumb
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbLabel =
    segments.length <= 1
      ? "Overview"
      : navItems.find((i) => i.href === pathname)?.label ?? segments[segments.length - 1];

  return (
    <div className={styles.layout}>
      {/* Overlay (mobile) */}
      {sidebarOpen && (
        <div
          className={styles.overlay}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ""}`}
      >
        <div className={styles.sidebarHeader}>
          <Link href="/" className={styles.brand}>
            <div className={styles.brandIcon}>
              <Heart size={16} strokeWidth={2.5} />
            </div>
            <span className={styles.brandText}>CardioGuard</span>
          </Link>
          <button
            className={styles.closeSidebar}
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className={styles.sidebarLabel}>MENU</div>

        <nav className={styles.nav}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${isActive ? styles.navItemActive : ""}`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userCard}>
            <div className={styles.avatar}>
              {user.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.photoURL}
                  alt=""
                  className={styles.avatarImg}
                />
              ) : (
                <span className={styles.avatarFallback}>
                  {(user.displayName || user.email || "D")[0].toUpperCase()}
                </span>
              )}
            </div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>
                {user.displayName || "Doctor"}
              </span>
              <span className={styles.userEmail}>{user.email}</span>
            </div>
          </div>
          <button className={styles.logoutBtn} onClick={handleSignOut}>
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className={styles.main}>
        {/* Topbar */}
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <button
              className={styles.menuBtn}
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <div className={styles.breadcrumb}>
              <span className={styles.breadcrumbRoot}>Dashboard</span>
              {breadcrumbLabel !== "Overview" && (
                <>
                  <ChevronRight size={14} />
                  <span className={styles.breadcrumbCurrent}>
                    {breadcrumbLabel}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className={styles.topbarRight}>
            <button className={styles.topbarIcon} aria-label="Notifications">
              <Bell size={18} />
              <span className={styles.notifDot} />
            </button>
            <div className={styles.topbarAvatar}>
              {user.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.photoURL} alt="" className={styles.avatarImg} />
              ) : (
                <span className={styles.avatarFallback}>
                  {(user.displayName || user.email || "D")[0].toUpperCase()}
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
