import { useState } from "react";
import "../../../shared/styles/ai_history_style.css";

const grupos = ["Hoy", "Ayer", "Últimos 7 días", "Este mes"];

function ListaHistorial({
  chats = [],             
  chatActivo,
  seleccionarChat,
  crearChat,              
  eliminarChat,           
  cerrar
}) {
  const [busqueda, setBusqueda] = useState("");

  const chatsFiltrados = chats.filter((chat) =>
    (chat.title + " " + chat.preview)
      .toLowerCase()
      .includes(busqueda.toLowerCase())
  );

  return (
    <div className="panel">
      <div className="panel-head">
        <button className="new-chat" onClick={crearChat}>
          + Nuevo chat
        </button>

        <input
          className="search-input"
          type="search"
          placeholder="Buscar conversaciones"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <nav className="history" aria-label="Historial">
        {chatsFiltrados.length === 0 ? (
          <p className="empty">
            {chats.length === 0
              ? "Aún no tienes conversaciones."
              : "No encontramos conversaciones con ese término."}
          </p>
        ) : (
          grupos.map((grupo) => {
            const chatsGrupo = chatsFiltrados.filter(
              (chat) => chat.group === grupo
            );

            if (chatsGrupo.length === 0) return null;

            return (
              <section className="group" key={grupo}>
                <h3>{grupo}</h3>

                <ul>
                  {chatsGrupo.map((chat) => (
                    <li className="item" key={chat.id}>
                      <button
                        className="item-btn"
                        aria-current={
                          chatActivo?.id === chat.id ? "true" : undefined
                        }
                        onClick={() => seleccionarChat(chat)}
                      >
                        <span className="item-icon">
                          {chatActivo?.id === chat.id
                            ? "✓"
                            : chat.flagged
                              ? "⚠"
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

                      <button
                        className="delete"
                        aria-label={`Eliminar ${chat.title}`}
                        onClick={() => eliminarChat(chat.id)}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })
        )}
      </nav>

      <p className="panel-foot">
        SKINOVA acompaña tu cuidado; no reemplaza una consulta dermatológica.
      </p>
    </div>
  );
}

export default ListaHistorial;