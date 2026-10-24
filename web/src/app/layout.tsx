import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Pixelify_Sans } from "next/font/google";
import { Providers } from "@/components/Providers";
import { BRAND } from "@/lib/config";
import { getApy } from "@/lib/apy";
import "./tokens.css";
import "./scene-motion.css";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });
const pixel = Pixelify_Sans({ subsets: ["latin"], variable: "--font-pixelify", weight: ["500", "600"], display: "swap" });

const site = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3200");
const description =
  "Deposit MUSD on Base and earn Mezo's MUSD Savings Rate, paid by Bitcoin borrowers. Bridged over Wormhole NTT. Withdraw any time.";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: `${BRAND.name} · ${BRAND.tagline}`,
  description,
  openGraph: {
    title: `${BRAND.name} · ${BRAND.tagline}`,
    description,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Levada: Mezo's savings rate, on Base." }],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/icon-512.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAF8F4" },
    { media: "(prefers-color-scheme: dark)", color: "#0B1022" },
  ],
};

/* Resolve day or night before first paint: ?theme= (for sharing), then the saved choice, then the system. */
const themeScript = `(function(){try{var d=document.documentElement,q=new URLSearchParams(location.search).get("theme"),s=null;try{s=localStorage.getItem("levada-theme")}catch(e){}var t=q==="dark"||q==="light"?q:s==="dark"||s==="light"?s:matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";d.dataset.theme=t;d.classList.add("js")}catch(e){}})();`;

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const apy = await getApy();
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} ${pixel.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers apy={apy}>{children}</Providers>
      </body>
    </html>
  );
}
