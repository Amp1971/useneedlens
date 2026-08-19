import './globals.css';

export const metadata = {
  title: 'UseNeedLens - Social Intent & Lead Monitor',
  description: 'Find developer leads and intent signals across developer communities',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-50 min-h-screen">
        {children}
      </body>
    </html>
  );
}
