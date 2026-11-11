import React, { useState } from 'react';
import "../../../shared/styles/ai_chat_style.css";
import HistorialConversaciones from "../components/HistorialConversaciones";
import Chat from "../components/Chat";
import AiChat from "../../../shared/components/CameraInput";
import MainLayout from "../../../shared/components/MainLayout";
import "../../../shared/styles/ai_history_style.css";

export function ConsultaIA(props) {
  const [selectedChat, setSelectedChat] = useState(null);

  const handleSelectConversation = (item) => setSelectedChat(item);
  const handleNewConsultation = () => setSelectedChat(null);

  const isNew = !selectedChat;

  return (
    <MainLayout>
      <div className="pa-page-layout">
        <aside className="pa-history-sidebar" aria-labelledby="pa-history-title">
          <h2 id="pa-history-title" className="pa-section-title">
            Historial de consultas
          </h2>
          <HistorialConversaciones
            onSelectConversation={handleSelectConversation}
            onNewConsultation={handleNewConsultation}
            selectedId={selectedChat?.id}
          />
        </aside>

        <main className="pa-main-content">
          <header className="pa-main-head">
            <h1 className="pa-main-title">Consulta con IA</h1>
            <h2 className="pa-chat-title">
              {isNew ? 'Nueva consulta' : selectedChat.title ?? 'Conversación guardada'}
            </h2>
            <p className="pa-main-subtitle">
              {isNew
                ? 'Pregunta por un producto o ingrediente y entiende cómo se relaciona con tu rutina.'
                : 'Revisa esta conversación o inicia una consulta nueva desde el historial.'}
            </p>
          </header>

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