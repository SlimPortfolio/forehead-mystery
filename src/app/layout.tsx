import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Caveat } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Whimsical hand-drawn display face for the logo/title — echoes the doodle icon.
const caveat = Caveat({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["700"],
});

export const metadata: Metadata = {
  title: "Forehead Mystery",
  description: "A cooperative online deduction game for 4–8 players.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Runs before hydration/paint so a returning dark-mode user never sees a
// flash of the light theme. Kept out of theme.ts (a client module) since
// this needs to run as a raw inline script, not imported JS.
const themeInitScript = `(function(){try{if(localStorage.getItem('forehead-mystery:theme')==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} ${caveat.variable} h-dvh overflow-hidden antialiased`}
        // The inline theme script below adds/removes `dark` on this element
        // before React hydrates, which would otherwise read as a mismatch.
        suppressHydrationWarning
      >
        <head>
          <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        </head>
        <body className="h-dvh overflow-hidden flex flex-col">{children}</body>
      </html>
    </ClerkProvider>
  );
}
