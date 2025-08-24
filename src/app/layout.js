import { Inter } from "next/font/google";
import 'bootstrap/dist/css/bootstrap.min.css'
import "./globals.css";
import AuthProvider  from '../context/auth';
import { getUserFromCookies } from "../lib/auth-server";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Denso-Cobotta-Pro-Control-IK",
};

export default async function RootLayout({ children }) {
  const user = await getUserFromCookies(); 
  console.log("Got User!", user);
  return (
    <html lang="ja">
      <body>
        <AuthProvider initialUser={user}>
           {children}
        </AuthProvider>
      </body>
    </html>
  );
}
