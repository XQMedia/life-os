/**
 * Root route — shows Character Creation if no character exists,
 * otherwise redirects to /dashboard. Since we use IndexedDB (client-only),
 * the redirect decision must happen on the client.
 */
import CharacterGate from '@/components/CharacterGate';

export default function Home() {
  return <CharacterGate />;
}
