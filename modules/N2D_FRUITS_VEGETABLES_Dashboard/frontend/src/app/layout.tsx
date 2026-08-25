import Header from "@/components/layout/Header";
import { QuickViewProvider } from "@/context/QuickViewContext";
import { CartProvider } from "@/context/CartContext";
import { SearchProvider } from "@/context/SearchContext";
import QuickViewDrawer from "@/components/product/QuickViewDrawer";
import CartDrawer from "@/components/cart/CartDrawer";
import FloatingCartBar from "@/components/cart/FloatingCartBar";
import "./globals.css";

export const metadata = {
  title: "Need2Done | Fresh Fruits & Vegetables",
  description: "Hyperlocal commerce platform for daily essentials in Bhongir.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <CartProvider>
          <SearchProvider>
            <QuickViewProvider>
              <Header />
              <main>
                {children}
              </main>
              <QuickViewDrawer />
              <CartDrawer />
              <FloatingCartBar />
            </QuickViewProvider>
          </SearchProvider>
        </CartProvider>
      </body>
    </html>
  );
}
