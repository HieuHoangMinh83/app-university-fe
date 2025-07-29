import Login from "@/components/auth/auth.signin";
import Register from "@/components/auth/auth.register";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { authOptions } from "@/app/utils/authOptions";

export const metadata: Metadata = {
  title: "Register page",
  description: "Đăng ký tài khoản ",
};
export default async function SigninPage() {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect("/vi");
  }
  return <Register></Register>;
}
