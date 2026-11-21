import type { Metadata } from "next";

// Keep the organisers' page out of search engines.
export const metadata: Metadata = { title: "Organisers · WESCOSA Staycation", robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
