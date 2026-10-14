import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AniTrack — Tu lista personal de Anime & Manga',
  description:
    'Lleva el control de todos los animes y mangas que ves, has leído o planeas ver. ' +
    'Tus datos, sin suscripciones, sin depender de nadie.',
  keywords: ['anime', 'manga', 'tracker', 'myanimelist', 'anilist', 'seguimiento', 'lista de anime'],
  icons: {
    icon: '/logo.jpg',
    apple: '/logo.jpg',
  },
  openGraph: {
    title: 'AniTrack — Anime & Manga Tracker',
    description: 'Tu lista personal de anime y manga, sin suscripciones.',
    type: 'website',
  },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es" className={`${inter.variable} ${outfit.variable}`}>
      <body>{children}</body>
    </html>
  );
}
