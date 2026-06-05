import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import NavBar from "./components/NavBar";
import { AuthProvider } from "./components/AuthProvider";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "POKET Meal Planner",
  description: "Plan meals, track your pantry, and manage your shopping list",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full`}>
      <body className="min-h-full bg-gray-50 text-gray-900 font-sans">
        <AuthProvider>
          <main className="max-w-lg mx-auto pb-20 min-h-screen">
            {children}
          </main>
          <NavBar />
        </AuthProvider>
      </body>
    </html>
  );
}
