// src/components/layout/AppLayout.jsx
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import useChat from '../../hooks/useChat';

const AppLayout = () => {
  const { activeConversation } = useChat();
  const location = useLocation();
  
  // On mobile, if we have an active conversation AND we're on the dashboard/chat page,
  // hide the sidebar. Otherwise, hide the main content area on mobile.
  const isChatView = Boolean(activeConversation) && (location.pathname === '/dashboard' || location.pathname === '/chat');

  return (
    <div className="flex h-screen bg-dark-950 text-white overflow-hidden">
      {/* Sidebar: Hidden on mobile if in chat view */}
      <div className={`${isChatView ? 'hidden md:flex' : 'flex'} w-full md:w-auto h-full`}>
        <Sidebar />
      </div>

      {/* Main content: Hidden on mobile if NOT in chat view, but always visible on desktop */}
      <main className={`${!isChatView ? 'hidden md:flex' : 'flex'} flex-1 overflow-hidden flex-col h-full`}>
        <Outlet /> 
      </main>
    </div>
  );
};

export default AppLayout;
