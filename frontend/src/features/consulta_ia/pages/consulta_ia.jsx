import React, { useState } from 'react';
import "../../../shared/styles/ai_chat_style.css";
import HistorialConversaciones from "../components/HistorialConversaciones";
import Chat from "../components/Chat";
import AiChat from "../../../shared/components/CameraInput";
import MainLayout from "../../../shared/components/MainLayout";

export function ConsultaIA(props) {
  const [selectedChat, setSelectedChat] = useState(null);

  const handleSelectConversation = (item) => setSelectedChat(item);
  const handleNewConsultation = () => setSelectedChat(null);

  return (
    <MainLayout>
      <div className="pa-page-layout">
        <aside className="pa-history-sidebar">
          <HistorialConversaciones
            onSelectConversation={handleSelectConversation}
            onNewConsultation={handleNewConsultation}
            selectedId={selectedChat?.id}
          />
        </aside>

        <main className="pa-main-content">
          {selectedChat ? (
            <Chat conversationData={selectedChat} />
          ) : (
            <AiChat {...props} />
          )}
        </main>
      </div>
    </MainLayout>
  );
}

export default ConsultaIA;