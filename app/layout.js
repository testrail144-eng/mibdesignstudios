import { AuthProvider } from "@/lib/auth";
import { ConfirmProvider } from "@/components/ConfirmProvider";
import "./globals.css";

export const metadata = {
  title: "Groundwork — Site & Vendor Ledger",
  description:
    "Construction & interior project management: BOQ, quotations, vendors, purchase orders, payments, daily logs, snags and tasks.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ConfirmProvider>{children}</ConfirmProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
