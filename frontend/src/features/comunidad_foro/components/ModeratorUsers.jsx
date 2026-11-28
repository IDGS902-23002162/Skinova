import { useEffect, useRef, useState } from "react";
import { useApi } from "../../../shared/hooks/useApi";

const endpoint = "/comunidad/foro/moderacion/usuarios";
const roles = { user: "Miembro", moderator: "Moderador", admin: "Administrador", suspended: "Suspendido" };

async function readJson(response) {
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) throw new Error(data?.error || "No se pudo completar la solicitud.");
  return data;
}

export default function ModeratorUsers() {
  const { fetchConAuth } = useApi();
  const confirmation = useRef(null);
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const [data, setData] = useState({ items: [], has_more: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [target, setTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ q: query, page: String(page) });
    async function load() {
      try {
        const result = await readJson(await fetchConAuth(`${endpoint}?${params}`, { signal: controller.signal }));
        if (!controller.signal.aborted) setData(result);
      } catch (requestError) {
        if (!controller.signal.aborted) setError(requestError.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [fetchConAuth, page, query, version]);

  function loadPage(nextPage, nextQuery = query) {
    setLoading(true);
    setError("");
    setPage(nextPage);
    setQuery(nextQuery);
    setVersion((current) => current + 1);
  }

  function ask(user) {
    setTarget(user);
    setSaveError("");
    confirmation.current.showModal();
  }

  async function appoint(event) {
    event.preventDefault();
    if (!target || saving) return;
    setSaving(true);
    setSaveError("");
    try {
      const result = await readJson(await fetchConAuth(
        `${endpoint}/${encodeURIComponent(target.id)}/moderador`, { method: "PUT" },
      ));
      setData((current) => ({
        ...current,
        items: current.items.map((user) => user.id === result.id ? { ...user, role: result.role } : user),
      }));
      setNotice(`Se nombró a ${target.name} como moderador.`);
      confirmation.current.close();
    } catch (requestError) {
      setSaveError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="comunidad-moderation-users" aria-labelledby="comunidad-users-title">
      <h3 id="comunidad-users-title">Usuarios de la comunidad</h3>
      <form className="comunidad-user-search" onSubmit={(event) => {
        event.preventDefault();
        loadPage(1, input.trim());
      }}>
        <label htmlFor="comunidad-user-query">Buscar por nombre o ID</label>
        <input id="comunidad-user-query" type="search" value={input} maxLength={100}
          onChange={(event) => setInput(event.target.value)} />
        <button className="comunidad-drawer-button" type="submit">Buscar</button>
      </form>
      <p className="comunidad-notice" role="status">{notice}</p>
      {loading && <p role="status">Cargando usuarios…</p>}
      {error && <p className="comunidad-form-error" role="alert">{error}</p>}
      {!loading && !error && data.items.length === 0 && <p>No se encontraron usuarios.</p>}
      {!loading && !error && (
        <ul className="comunidad-user-list">
          {data.items.map((user) => (
            <li key={user.id}>
              <div>
                <strong>{user.name}</strong>
                <small>ID {user.id.slice(0, 8)} · {roles[user.role] || user.role}</small>
              </div>
              {user.role === "user" && (
                <button type="button" className="comunidad-drawer-button" onClick={() => ask(user)}
                  aria-label={`Nombrar moderador a ${user.name}, ID ${user.id.slice(0, 8)}`}>
                  Nombrar moderador
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {(page > 1 || data.has_more) && (
        <div className="comunidad-user-pages">
          <button type="button" className="comunidad-drawer-button" disabled={loading || page === 1}
            onClick={() => loadPage(page - 1)}>Anterior</button>
          <span>Página {page}</span>
          <button type="button" className="comunidad-drawer-button" disabled={loading || error || !data.has_more}
            onClick={() => loadPage(page + 1)}>Siguiente</button>
        </div>
      )}
      <dialog ref={confirmation} className="comunidad-role-confirm" aria-labelledby="comunidad-role-title"
        onCancel={(event) => {
          event.stopPropagation();
          if (saving) event.preventDefault();
        }} onClose={() => setTarget(null)}>
        <h3 id="comunidad-role-title">Confirmar nombramiento</h3>
        <p><strong>{target?.name}</strong> (ID {target?.id.slice(0, 8)}) podrá revisar reportes, publicar avisos de moderación y nombrar a otros moderadores.</p>
        <form className="comunidad-user-pages" onSubmit={appoint}>
          <button type="button" className="comunidad-drawer-button" autoFocus disabled={saving}
            onClick={() => confirmation.current.close()}>Cancelar</button>
          <button type="submit" className="skinova-module-primary" disabled={saving}>
            {saving ? "Guardando…" : "Confirmar nombramiento"}
          </button>
        </form>
        {saveError && <p className="comunidad-form-error" role="alert">{saveError}</p>}
      </dialog>
    </section>
  );
}
