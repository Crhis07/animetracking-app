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
  title: 'AnimeTracker — Tu lista personal de anime',
  description:
    'Lleva el control de todos los animes que ves, has visto o planeas ver. ' +
    'Tus datos, sin suscripciones, sin depender de nadie.',
  keywords: ['anime', 'tracker', 'myanimelist', 'anilist', 'seguimiento', 'lista de anime'],
  openGraph: {
    title: 'AnimeTracker',
    description: 'Tu lista personal de anime, sin suscripciones.',
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
