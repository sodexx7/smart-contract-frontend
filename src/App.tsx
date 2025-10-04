import { useState } from "react";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { MainContent } from "./components/MainContent";
import { CreateStreamModal } from "./components/CreateStreamModal";
import { StreamDetail } from "./components/StreamDetail";

export default function App() {
  const [isCreateStreamOpen, setIsCreateStreamOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("outgoing");
  const [selectedStream, setSelectedStream] = useState<any>(null);
  const [streamPerspective, setStreamPerspective] = useState<
    "sender" | "recipient"
  >("sender");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [outgoingStatusFilter, setOutgoingStatusFilter] = useState<string>('all');
  const [incomingStatusFilter, setIncomingStatusFilter] = useState<string>('all');

  const openCreateStream = () => {
    setIsCreateStreamOpen(true);
  };

  const closeCreateStream = () => {
    setIsCreateStreamOpen(false);
  };

  const navigateToTab = (tab: string) => {
    setActiveTab(tab);
  };

  const handleStatusFilter = (streamType: 'outgoing' | 'incoming', status: string) => {
    if (streamType === 'outgoing') {
      setOutgoingStatusFilter(status);
    } else {
      setIncomingStatusFilter(status);
    }
    // Switch to the relevant tab when filtering
    setActiveTab(streamType);
  };

  const openStreamDetail = (
    stream: any,
    perspective: "sender" | "recipient"
  ) => {
    setSelectedStream(stream);
    setStreamPerspective(perspective);
  };

  const closeStreamDetail = () => {
    setSelectedStream(null);
  };

  const handleStreamUpdate = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar
          onNavigateToCreateStream={openCreateStream}
          onNavigateToTab={navigateToTab}
          onStatusFilter={handleStatusFilter}
        />
        <MainContent
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onStreamClick={openStreamDetail}
          refreshTrigger={refreshTrigger}
          outgoingStatusFilter={outgoingStatusFilter}
          incomingStatusFilter={incomingStatusFilter}
          onOutgoingStatusFilterChange={setOutgoingStatusFilter}
          onIncomingStatusFilterChange={setIncomingStatusFilter}
        />
      </div>
      <CreateStreamModal
        isOpen={isCreateStreamOpen}
        onClose={closeCreateStream}
      />
      <StreamDetail
        stream={selectedStream}
        perspective={streamPerspective}
        onClose={closeStreamDetail}
        onStreamUpdate={handleStreamUpdate}
      />
    </div>
  );
}
