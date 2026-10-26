import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Building Issues', description: 'One shared building issue, one incident, one communication thread.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
