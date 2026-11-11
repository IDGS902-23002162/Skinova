import React, { useState } from "react";
import "../../../shared/styles/ai_chat_style.css";

const grupos = ["Hoy", "Ayer", "Últimos 7 días", "Este mes", "Anteriores"];

function getGroupForDate(isoDate) {
  if (!isoDate) return "Hoy";
  const itemDate = new Date(isoDate);
  const now = new Date();

  if (itemDate.toDateString() === now.toDateString()) {
    return "Hoy";
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (itemDate.toDateString() === yesterday.toDateString()) {
    return "Ayer";
  }

  const diffDays = Math.floor((now.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 7) {
    return "Últimos 7 días";
  }

  if (itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear()) {
    return "Este mes";
  }

  return "Anteriores";
}

function ListaHistorial({
  chats = [],             
  chatActivo,
  seleccionarChat,
  crearChat,              
  eliminarChat,           
  cerrar
}) {
  const [busqueda, setBusqueda] = useState("");

  const chatsConGrupo = chats.map((chat) => ({
    ...chat,
    group: chat.group || getGroupForDate(chat.created_at)
  }));

  const chatsFiltrados = chatsConGrupo.filter((chat) =>
    ((chat.title || "") + " " + (chat.preview || ""))
      .toLowerCase()
      .includes(busqueda.toLowerCase())
  );

  return (
    <div className="panel" role="dialog" aria-label="Historial de consultas">
      <div className="panel-head">
        <button type="button" className="new-chat" onClick={crearChat}>
          + Nueva consulta
        </button>

        <input
          className="search-input"
          type="search"
          placeholder="Buscar consultas previas..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <nav className="history" aria-label="Historial" style={{ maxHeight: "360px", overflowY: "auto" }}>
        {chatsFiltrados.length === 0 ? (
          <p className="empty" style={{ padding: "16px", textAlign: "center", color: "var(--muted-fg, #666)" }}>
            {chats.length === 0
              ? "Aún no tienes consultas registradas."
              : "No encontramos consultas con ese término."}
          </p>
        ) : (
          grupos.map((grupo) => {
            const chatsGrupo = chatsFiltrados.filter(
              (chat) => chat.group === grupo
            );

            if (chatsGrupo.length === 0) return null;

            return (
              <section className="group" key={grupo}>
                <h3 style={{ padding: "8px 16px", fontSize: "12px", color: "var(--forest-mid, #2d6658)", textTransform: "uppercase" }}>
                  {grupo}
                </h3>

                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {chatsGrupo.map((chat) => (
                    <li className="item" key={chat.id}>
                      <button
                        type="button"
                        className="item-btn"
                        aria-current={
                          chatActivo?.id === chat.id ? "true" : undefined
                        }
                        onClick={() => seleccionarChat(chat)}
                      >
                        <span className="item-icon" aria-hidden="true">
                          {chatActivo?.id === chat.id
                            ? "✓"
                            : chat.flagged
                              ? "⚠️"
                              : "💬"}
                        </span>

                        <span className="item-body">
                          <span className="item-row">
                            <span className="item-title">
                              {chat.title}
                            </span>
                            <span className="item-time">
                              {chat.time}
                            </span>
                          </span>

                          <span className="item-preview">
                            {chat.preview}
                          </span>
                        </span>
                      </button>

                      {eliminarChat && (
                        <button
                          type="button"
                          className="delete"
                          aria-label={`Eliminar ${chat.title}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            eliminarChat(chat.id);
                          }}
                        >
                          ×
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })
        )}
      </nav>

      <p className="panel-foot" style={{ padding: "10px 14px", fontSize: "11px", textAlign: "center" }}>
        SKINOVA acompaña tu cuidado; no reemplaza una consulta dermatológica.
      </p>
    </div>
  );
}

export default ListaHistorial;
