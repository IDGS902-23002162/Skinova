import React, { useState } from "react";
import ListaHistorial from "./ListaHistorial";
import "../../../shared/styles/ai_history_style.css";

function HistorialConversaciones({
  onSelectConversation,
  onNewConsultation,
  selectedId,
  chats = [],
  onDeleteConversation
}) {
  const [abierto, setAbierto] = useState(false);

  const chatActivo = chats.find((c) => c.id === selectedId) || null;

  const handleSelect = (chat) => {
    if (onSelectConversation) {
      onSelectConversation(chat);
    }
    setAbierto(false);
  };

  const handleCreate = () => {
    if (onNewConsultation) {
      onNewConsultation();
    }
    setAbierto(false);
  };

  return (
    <div className="chat-dropdown">
      <button
        type="button"
        className="trigger"
        onClick={() => setAbierto(!abierto)}
        aria-expanded={abierto}
      >
        <span className="trigger-icon" aria-hidden="true">💬</span>

        <span className="trigger-text">
          <span className="trigger-label">Conversación</span>
          <span className="trigger-title">
            {chatActivo?.title || "Nueva consulta"}
          </span>
        </span>

        <span className="chevron" aria-hidden="true">
          {abierto ? "▲" : "▼"}
        </span>
      </button>

      {abierto && (
        <ListaHistorial
          chats={chats}
          chatActivo={chatActivo}
          seleccionarChat={handleSelect}
          crearChat={handleCreate}
          eliminarChat={onDeleteConversation}
          cerrar={() => setAbierto(false)}
        />
      )}
    </div>
  );
}

export default HistorialConversaciones;
