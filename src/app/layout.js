import { Inter } from "next/font/google";
import 'bootstrap/dist/css/bootstrap.min.css'
import "./globals.css";
import { AuthProvider } from '../context/auth';


const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Denso-Cobotta-Pro-Control-IK",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <AuthProvider>
        <body className={inter.className}>{children}</body>
      </AuthProvider>
    </html>
  );
}
