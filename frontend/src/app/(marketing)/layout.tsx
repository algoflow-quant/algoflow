import { ReactNode } from 'react';
import NavBar from '@/components/layout/navigation/navbar';

export default function MarketingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
        <header>
            <NavBar />
        </header>
        
        <main className="flex-1">{children}</main>
    </div>
  );
}
