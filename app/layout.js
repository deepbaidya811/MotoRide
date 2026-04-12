import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LoadingProvider } from './contexts/LoadingContext';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "MotoRide - Quick Motorcycle Rides",
  description: "Fast, affordable motorcycle rides at your fingertips. Download MotoRide app now!",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LoadingProvider>
          {children}
        </LoadingProvider>
      </body>
    </html>
  );
}
