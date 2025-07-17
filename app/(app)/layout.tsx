"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";
import {
  LogOutIcon,
  MenuIcon,
  LayoutDashboardIcon,
  Share2Icon,
  UploadIcon,
} from "lucide-react";

const sidebarItems = [
  { href: "/home", icon: LayoutDashboardIcon, label: "Home" },
  { href: "/social-share", icon: Share2Icon, label: "Social Share" },
  { href: "/video-upload", icon: UploadIcon, label: "Video Upload" },
];

const NavLink = React.memo(function NavLink({
  href,
  icon: Icon,
  label,
  active,
  onClick,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
        active
          ? "bg-white text-black shadow-md"
          : "text-gray-400 hover:bg-gray-900 hover:text-white"
      }`}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
});

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useClerk();
  const { user } = useUser();

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    await signOut();
  };

  const displayName =
    user?.username || user?.emailAddresses?.[0]?.emailAddress || "User";

  return (
    <div className="flex h-screen bg-black text-white">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r border-white/10 lg:bg-black lg:px-4 lg:py-6">
        <h1
          onClick={() => router.push("/")}
          className="mb-8 cursor-pointer text-2xl font-bold text-white hover:text-gray-300 transition-colors duration-200"
        >
          PixelNimbus
        </h1>

        <nav className="flex flex-col gap-1">
          {sidebarItems.map((item) => (
            <NavLink
              key={item.href}
              {...item}
              active={pathname === item.href}
              onClick={() => setMobileOpen(false)}
            />
          ))}
        </nav>

        {user && (
          <div className="mt-auto flex items-center gap-3 pt-6 border-t border-white/10">
            <Image
              src={user.imageUrl}
              alt="User avatar"
              width={40}
              height={40}
              className="h-10 w-10 rounded-full border border-white/20 object-cover"
            />
            <div className="flex-1 truncate">
              <p className="text-sm font-medium text-white">{displayName}</p>
              <button
                onClick={handleSignOut}
                disabled={isLoggingOut}
                className="text-xs text-gray-400 hover:text-white hover:underline disabled:opacity-50 transition-colors duration-200"
              >
                Sign out
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Overlay - Mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/80 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - Mobile */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-black px-4 py-6 border-r border-white/10 shadow-2xl transition-transform duration-300 lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <h1
          onClick={() => {
            router.push("/");
            setMobileOpen(false);
          }}
          className="mb-8 cursor-pointer text-2xl font-bold text-white hover:text-gray-300 transition-colors duration-200"
        >
          PixelNimbus
        </h1>

        <nav className="flex flex-col gap-1">
          {sidebarItems.map((item) => (
            <NavLink
              key={item.href}
              {...item}
              active={pathname === item.href}
              onClick={() => setMobileOpen(false)}
            />
          ))}
        </nav>

        {user && (
          <div className="mt-auto flex items-center gap-3 pt-6 border-t border-white/10">
            <Image
              src={user.imageUrl}
              alt="User avatar"
              width={40}
              height={40}
              className="h-10 w-10 rounded-full border border-white/20 object-cover"
            />
            <div className="flex-1 truncate">
              <p className="text-sm font-medium text-white">{displayName}</p>
              <button
                onClick={handleSignOut}
                disabled={isLoggingOut}
                className="text-xs text-gray-400 hover:text-white hover:underline disabled:opacity-50 transition-colors duration-200"
              >
                Sign out
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Main Layout */}
      <div className="flex flex-1 flex-col">
        {/* Topbar */}
        <header className="flex items-center justify-between border-b border-white/10 bg-black px-4 py-3 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-md p-2 hover:bg-white/10 lg:hidden transition-colors duration-200"
              aria-label="Open sidebar"
            >
              <MenuIcon className="h-6 w-6 text-white" />
            </button>
            <h2 className="text-lg font-semibold text-white">Dashboard</h2>
          </div>

          {user && (
            <div className="flex items-center gap-3">
              <Image
                src={user.imageUrl}
                alt="User avatar"
                width={32}
                height={32}
                className="h-8 w-8 rounded-full border border-white/20 object-cover"
              />
              <span className="hidden text-sm text-gray-300 truncate sm:inline-block max-w-xs">
                {displayName}
              </span>
              <button
                onClick={handleSignOut}
                disabled={isLoggingOut}
                className="rounded-md p-2 hover:bg-white/10 transition-colors duration-200"
                title="Sign out"
              >
                <LogOutIcon className="h-5 w-5 text-gray-400 hover:text-white transition-colors duration-200" />
              </button>
            </div>
          )}
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 text-white bg-black">
          {children}
        </main>
      </div>
    </div>
  );
}