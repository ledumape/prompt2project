import '@fontsource-variable/dm-sans';
import '@fontsource-variable/space-grotesk';
import '@fontsource/ibm-plex-mono/400.css';
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Prompt2Project — Turn an idea into a buildable project',
  description: 'A pragmatic AI planning copilot that turns rough software ideas into clear, editable project specifications and coding agent prompts.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-theme="dark"><body>{children}</body></html>;
}
