import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MelodAI - Yapay Zeka Destekli Spotify Asistanı",
  description:
    "Spotify hesabınızla canlı bağlantı kuran yapay zeka müzik asistanı. Müzik zevkinizi analiz eder, kişisel öneriler sunar ve size özel deneyimler yaratır.",
  keywords: [
    "spotify",
    "yapay zeka",
    "ai",
    "müzik",
    "asistan",
    "playlist",
    "öneri",
    "algoritma",
    "openai",
    "gpt-4",
    "melodai",
  ],
  authors: [{ name: "MelodAI Team" }],
  creator: "MelodAI",
  publisher: "MelodAI",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: "https://melodai.app",
    title: "MelodAI - Size Her Şeyi Ayarlayabilir",
    description:
      "Yapay zeka destekli müzik asistanınız. Spotify hesabınızla canlı bağlantı kurar, müzik zevkinizi analiz eder ve gerçek zamanlı müzikal büyü yaratır.",
    siteName: "MelodAI",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "MelodAI - Yapay Zeka Destekli Spotify Asistanı",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MelodAI - Yapay Zeka Destekli Spotify Asistanı",
    description:
      "Size her şeyi ayarlayabilir. Spotify × AI ile müziğin geleceği.",
    images: ["/twitter-card.jpg"],
    creator: "@melodai_app",
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      {
        rel: "mask-icon",
        url: "/safari-pinned-tab.svg",
        color: "#10b981",
      },
    ],
  },
  manifest: "/manifest.json",
  category: "music",
  classification: "AI Music Assistant",
  colorScheme: "dark",
  themeColor: "#10b981",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  verification: {
    google: "verification_token_here",
  },
  alternates: {
    canonical: "https://melodai.app",
    languages: {
      "tr-TR": "https://melodai.app",
      "en-US": "https://melodai.app/en",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "MelodAI",
              description: "Yapay zeka destekli Spotify müzik asistanı",
              url: "https://melodai.app",
              applicationCategory: "MusicApplication",
              operatingSystem: "Web",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
              creator: {
                "@type": "Organization",
                name: "MelodAI Team",
              },
              featureList: [
                "Spotify entegrasyonu",
                "Yapay zeka önerileri",
                "Gerçek zamanlı müzik kontrolü",
                "Kişiselleştirilmiş deneyim",
              ],
            }),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
