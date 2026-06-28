import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import AIChatSidebar from '@/components/AIChatSidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        <TopBar />
        <main className="page-content">{children}</main>
      </div>
      <AIChatSidebar />
    </div>
  );
}
