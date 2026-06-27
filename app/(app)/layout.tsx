import Nav from '@/components/Nav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main className="pt-14 min-h-dvh">{children}</main>
    </>
  );
}
