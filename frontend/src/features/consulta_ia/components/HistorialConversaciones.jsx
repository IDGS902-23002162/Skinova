
import { useState } from "react";
import ListaHistorial from "./ListaHistorial";
import "../../../shared/styles/ai_history_style.css";

function HistorialConversaciones() {
  const [abierto, setAbierto] = useState(false);
  const [chatActivo, setChatActivo] = useState(null);

  const seleccionarChat = (chat) => {
    setChatActivo(chat);
    setAbierto(false);
  };

  return (
    <div className="chat-dropdown">
      <button
        className="trigger"
        onClick={() => setAbierto(!abierto)}
        aria-expanded={abierto}
      >
        <span className="trigger-icon">💬</span>

        <span className="trigger-text">
          <span className="trigger-label">Conversación</span>
          <span className="trigger-title">
            {chatActivo?.title || "Nuevo chat"}
          </span>
        </span>

        <span className="chevron">
          {abierto ? "▲" : "▼"}
        </span>
      </button>

      {abierto && (
        <ListaHistorial
          chatActivo={chatActivo}
          seleccionarChat={seleccionarChat}
          cerrar={() => setAbierto(false)}
        />
      )}
    </div>
  );
}

export default HistorialConversaciones;
