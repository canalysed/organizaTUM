import type { Metadata } from "next";
import { Instrument_Serif, JetBrains_Mono, Playfair_Display, Exo_2 } from "next/font/google";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  weight: ["400"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const playfair = Playfair_Display({
  weight: ["400"],
  style: ["italic"],
  subsets: ["latin"],
  variable: "--font-prata",
  display: "swap",
});

const exo2 = Exo_2({
  weight: ["700"],
  subsets: ["latin"],
  variable: "--font-exo2",
  display: "swap",
});

export const metadata: Metadata = {
  title: "OrganizaTUM — TUM Student Scheduler",
  description: "AI-powered personalized weekly schedule for TUM students",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${instrumentSerif.variable} ${jetbrainsMono.variable} ${playfair.variable} ${exo2.variable}`} suppressHydrationWarning>
      <head>
        {/* Anti-FOUC: apply dark mode before hydration */}
        <script dangerouslySetInnerHTML={{ __html: `try{const s=JSON.parse(localStorage.getItem('organizatum-user')||'{}');if(s.state?.darkMode)document.documentElement.setAttribute('data-theme','dark');}catch(e){}` }}/>
      </head>
      <body style={{ fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
