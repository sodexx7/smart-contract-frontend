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
  const [streamPerspective, setStreamPerspective] = useState<"sender" | "recipient">("sender");

  const openCreateStream = () => {
    setIsCreateStreamOpen(true);
  };

  const closeCreateStream = () => {
    setIsCreateStreamOpen(false);
  };

  const navigateToTab = (tab: string) => {
    setActiveTab(tab);
  };

  const openStreamDetail = (stream: any, perspective: "sender" | "recipient") => {
    setSelectedStream(stream);
    setStreamPerspective(perspective);
  };

  const closeStreamDetail = () => {
    setSelectedStream(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar 
          onNavigateToCreateStream={openCreateStream}
          onNavigateToTab={navigateToTab}
        />
        <MainContent 
          activeTab={activeTab} 
          onTabChange={setActiveTab}
          onStreamClick={openStreamDetail}
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
      />
    </div>
  );
}