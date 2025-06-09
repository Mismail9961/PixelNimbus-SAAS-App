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

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useClerk();
  const { user } = useUser();

  const handleSignOut = async () => {
    await signOut();
  };

  const NavLink = ({
    href,
    icon: Icon,
    label,
  }: (typeof sidebarItems)[number]) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        onClick={() => setMobileOpen(false)}
        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          active ? "bg-blue-100 text-blue-600" : "text-gray-700 hover:bg-gray-100"
        }`}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span className="truncate">{label}</span>
      </Link>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* ───── Sidebar (desktop) ───── */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:bg-white lg:px-4 lg:py-6">
        <h1
          onClick={() => router.push("/")}
          className="mb-8 cursor-pointer text-2xl font-bold text-blue-600"
        >
          PixelNimbus
        </h1>

        <nav className="flex flex-col gap-1">
          {sidebarItems.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </nav>

        {user && (
          <div className="mt-auto flex items-center gap-3 pt-6 border-t">
            <Image
              src={user.imageUrl}
              alt="user"
              width={40}
              height={40}
              className="h-10 w-10 rounded-full border object-cover"
            />
            <div className="flex-1 truncate">
              <p className="text-sm font-medium text-gray-900">
                {user.username || user.emailAddresses[0].emailAddress}
              </p>
              <button
                onClick={handleSignOut}
                className="text-xs text-red-500 hover:underline"
              >
                Sign out
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* ───── Mobile overlay ───── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ───── Mobile sidebar ───── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white px-4 py-6 shadow-md transition-transform duration-300 lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <h1
          onClick={() => {
            router.push("/");
            setMobileOpen(false);
          }}
          className="mb-8 cursor-pointer text-2xl font-bold text-blue-600"
        >
          PixelNimbus
        </h1>
        <nav className="flex flex-col gap-1">
          {sidebarItems.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </nav>

        {user && (
          <div className="mt-auto flex items-center gap-3 pt-6 border-t">
            <Image
              src={user.imageUrl}
              alt="user"
              width={40}
              height={40}
              className="h-10 w-10 rounded-full border object-cover"
            />
            <div className="flex-1 truncate">
              <p className="text-sm font-medium text-gray-900">
                {user.username || user.emailAddresses[0].emailAddress}
              </p>
              <button
                onClick={handleSignOut}
                className="text-xs text-red-500 hover:underline"
              >
                Sign out
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* ───── Main Content Area ───── */}
      <div className="flex flex-1 flex-col">
        {/* Top Navbar */}
        <header className="flex items-center justify-between border-b bg-white px-4 py-3 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-md p-2 hover:bg-gray-100 lg:hidden"
            >
              <MenuIcon className="h-6 w-6" />
            </button>
            <h2 className="text-lg font-semibold text-gray-800">Dashboard</h2>
          </div>

          {user && (
            <div className="flex items-center gap-3">
              <Image
                src={user.imageUrl}
                alt="user"
                width={32}
                height={32}
                className="h-8 w-8 rounded-full border object-cover"
              />
              <span className="hidden text-sm text-gray-700 truncate sm:inline-block max-w-xs">
                {user.username || user.emailAddresses[0].emailAddress}
              </span>
              <button
                onClick={handleSignOut}
                className="rounded-md p-2 hover:bg-gray-100"
                title="Sign out"
              >
                <LogOutIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
