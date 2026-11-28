import { useEffect, useRef, useState } from "react";
import { Bell, Megaphone, ShieldCheck, UsersRound, X } from "lucide-react";
import { useApi } from "../../../shared/hooks/useApi";
import ForumActivity from "./ForumActivity";
import ModeratorBulletins from "./ModeratorBulletins";
import ModeratorUsers from "./ModeratorUsers";

export default function ForumSideMenu({ onClose, onOpenPost, onModerated }) {
  const { fetchConAuth } = useApi();
  const dialog = useRef(null);
  const [view, setView] = useState("bulletins");
  const [account, setAccount] = useState(null);
  const [accountError, setAccountError] = useState("");

  useEffect(() => {
    const panel = dialog.current;
    panel.showModal();
    return () => panel.close();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function loadAccount() {
      try {
        const response = await fetchConAuth("/comunidad/foro/me", { signal: controller.signal });
        if (!response.ok) throw new Error("No se pudieron cargar tus permisos.");
        const data = await response.json();
        if (!controller.signal.aborted) setAccount(data);
      } catch (error) {
        if (!controller.signal.aborted) setAccountError(error.message);
      }
    }
    loadAccount();
    return () => controller.abort();
  }, [fetchConAuth]);

  const sections = [
    { id: "bulletins", label: "Tabloide", icon: Megaphone },
    { id: "notifications", label: "Avisos", icon: Bell },
  ];
  if (account?.is_moderator) sections.push({ id: "reports", label: "Moderación", icon: ShieldCheck });
  if (account?.can_assign_moderators) sections.push({ id: "users", label: "Usuarios", icon: UsersRound });

  function close() {
    dialog.current?.close();
    onClose();
  }

  return (
    <dialog ref={dialog} id="community-side-menu" className="comunidad-drawer"
      aria-labelledby="community-side-menu-title"
      onCancel={(event) => {
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        close();
      }}
      onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div className="comunidad-drawer-content">
        <header className="comunidad-drawer-header">
          <h2 id="community-side-menu-title">Menú de Comunidad</h2>
          <button type="button" className="comunidad-drawer-close" aria-label="Cerrar menú" onClick={close}>
            <X size={21} aria-hidden="true" />
          </button>
        </header>
        <nav className="skinova-module-segments comunidad-drawer-nav" aria-label="Secciones de Comunidad">
          {sections.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" aria-pressed={view === id} onClick={() => setView(id)}>
              <Icon size={17} aria-hidden="true" /> {label}
            </button>
          ))}
        </nav>
        {accountError && <p className="comunidad-form-error" role="alert">{accountError}</p>}
        {view === "bulletins" && <ModeratorBulletins isModerator={Boolean(account?.is_moderator)} />}
        {view === "notifications" && <ForumActivity mode="notifications" onOpenPost={async (id) => {
          await onOpenPost(id);
          close();
        }} />}
        {view === "reports" && account?.is_moderator &&
          <ForumActivity mode="reports" onModerated={onModerated} />}
        {view === "users" && account?.can_assign_moderators && <ModeratorUsers />}
      </div>
    </dialog>
  );
}
