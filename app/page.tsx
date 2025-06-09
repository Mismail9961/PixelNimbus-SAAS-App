// app/layout.tsx
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ReactNode } from "react";

export const metadata = {
  title: "PixelNimbus",
  description: "Cloudinary SAAS App",
};

export default function Page() {
  return <div>Welcome to the Cloudinary SAAS App</div>;
}
