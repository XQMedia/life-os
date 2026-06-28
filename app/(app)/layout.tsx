import Nav from '@/components/Nav';
import AIChatSidebar from '@/components/AIChatSidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main className="pt-14 min-h-dvh">{children}</main>
      <AIChatSidebar />
    </>
  );
}
