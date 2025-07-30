import { withAuth } from "next-auth/middleware";
import createIntlMiddleware from "next-intl/middleware";
import { NextRequest } from "next/server";

// Cấu hình locale cho next-intl
const locales = ["vi"];

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale: "vi",
});

// Bọc toàn bộ route với middleware đăng nhập, trừ /auth/*
const authMiddleware = withAuth(
  (req) => intlMiddleware(req), // tích hợp với next-intl
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
  if (pathname.startsWith("/auth") || pathname.startsWith("/vi/auth")) {
    return intlMiddleware(req); // chỉ xử lý locale
  }

  // ✅ Các route còn lại đều qua authMiddleware + intl
  return (authMiddleware as any)(req);
}
