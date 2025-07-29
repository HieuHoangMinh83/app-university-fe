import { withAuth } from "next-auth/middleware";
import createIntlMiddleware from "next-intl/middleware";
import { NextRequest } from "next/server";

const locales = ["vi"];
const privatePages = ["/private"];

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale: "vi",
});

const authMiddleware = withAuth(
  // Note that this callback is only invoked if
  // the `authorized` callback has returned `true`
  // and not for pages listed in `pages`.
  function onSuccess(req) {
    return intlMiddleware(req);
  },
  {
    callbacks: {
      authorized: ({ token }) => token != null,
    },
    pages: {
      signIn: `auth/login`,
    },
  }
);

export default function middleware(req: NextRequest) {
  let isAuth = false;
  privatePages.map((path) => {
    if (req.nextUrl.pathname.includes(path)) {
      isAuth = true;
    }
  });
  if (isAuth) {
    return (authMiddleware as any)(req);
  } else {
    return intlMiddleware(req);
  }
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
