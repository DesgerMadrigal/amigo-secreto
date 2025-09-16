// src/app/layout.tsx
import "./globals.css";
import Providers from "@/components/Providers"; // <- client wrapper

export const metadata = { title: "Amigo Secreto" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-dvh bg-white text-black">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
