import Themefull from "@/components/Theme/Theme";
import NextAuthWrapper from "@/lib/providers/nextauth.provider";
import ThemeProvider from "@/lib/providers/ThemeProvider";
import NProgressWrapper from "@/lib/providers/nextprogressBar.wrapper";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import "primereact/resources/themes/lara-light-cyan/theme.css";
import "primeicons/primeicons.css";
import "antd/dist/reset.css";
import type { Metadata } from "next";
import ReactQueryProvider from "@/lib/providers/ReactQueryProvider";

export const metadata: Metadata = {
  title: "Aura Group - App Nội Bộ",
  description: "Ứng dụng quản lý nội bộ",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>
        <NProgressWrapper>
          <NextAuthWrapper>
            <ReactQueryProvider>
              <ThemeProvider>
                <Themefull>{children}</Themefull>
                <Toaster />
              </ThemeProvider>
            </ReactQueryProvider>
          </NextAuthWrapper>
        </NProgressWrapper>
      </body>
    </html>
  );
}

