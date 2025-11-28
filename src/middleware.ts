import { withAuth } from "next-auth/middleware";
import { NextRequest, NextResponse } from "next/server";

// Bọc toàn bộ route với middleware đăng nhập, trừ /auth/*
const authMiddleware = withAuth(
  (req) => {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/auth/login",
    },
  }
);

// Middleware chính
export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ❌ Bỏ qua auth middleware với bất kỳ route /auth/*
  if (pathname.startsWith("/auth")) {
    return NextResponse.next();
  }

  // ✅ Các route còn lại đều qua authMiddleware
  return (authMiddleware as any)(req);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
