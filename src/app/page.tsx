import { getServerSession } from "next-auth";
import type { Metadata } from "next";
import { authOptions } from "./utils/authOptions";
import Dashboard from "@/components/dashboard";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Trang chủ",
};

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  return <Dashboard serverSession={session} />;
}

