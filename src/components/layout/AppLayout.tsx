import { Outlet } from 'react-router-dom';

import { CompanySwitchOverlay } from '../CompanySwitchOverlay';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-muted/30">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="min-h-0 flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      <CompanySwitchOverlay />
    </div>
  );
}
