import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "MILT — Teacher Rankings",
  description: "Teacher ranking and voting platform across 11 MILT branches.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0a0e17] text-slate-200 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
