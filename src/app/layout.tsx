import type { Metadata } from "next";
import "./globals.css";

// Plain system font stack instead of next/font/google — that previously
// fetched Geist from Google Fonts at build time, an external network
// dependency with no real payoff here (nothing about this app needs a
// custom typeface), and one more thing that could fail in a locked-down
// build environment for no good reason.
const systemFontStack =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export const metadata: Metadata = {
  title: "LeadLens",
  description: "AI-assisted lead prioritization for real estate sales teams.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased" style={{ fontFamily: systemFontStack }}>
      <body className="min-h-full flex flex-col bg-[#F7F8FA] text-slate-900">{children}</body>
    </html>
  );
}
