import { getServerSession } from "next-auth";
import type { Metadata } from "next";

import CmpHome from "@/components/Home/cmpHome";
import { authOptions } from "../utils/authOptions";
import Dashboard from "@/components/dashboard";

export const metadata: Metadata = {
  title: "Home page",
  description: "home page description",
};
export default async function HomePage() {
  const session = await getServerSession(authOptions);


  return <Dashboard serverSession={session} />;
}
