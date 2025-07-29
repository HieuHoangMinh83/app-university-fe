import Login from "@/components/auth/auth.signin";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { authOptions } from "@/app/utils/authOptions";

export const metadata: Metadata = {
  title: "Login page",
  description: "Đăng nhập ",
  openGraph: {
    title: "Login page",
    description: "Đăng nhập trang website",
    type: "website",
    images:
      "[https://image.freepik.com/free-vector/login-concept-illustration_114360-739.jpg]",
  },
};
export default async function SigninPage() {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect("/vi"); // chuyen huong ben server
    //chuyen huong ben client useRouter ->push
  }

  return <Login></Login>;
}
