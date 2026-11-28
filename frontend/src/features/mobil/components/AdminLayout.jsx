import React, { useEffect } from "react";
import { useApi } from "../../../shared/hooks/useApi";
import AdminNavigation from "./AdminNavigation";
import "./AdminLayout.css";
import "./MobilShared.css";

/**
 * AdminLayout — wrapper que coloca la navegación de admin
 * (sidebar en desktop, bottom-nav en móvil) y el contenido principal.
 */
export default function AdminLayout({ children }) {
  const { fetchConAuth } = useApi();

  useEffect(() => {
    let unsubscribe = null;
    let pollTimer = null;

    const handleClerkUpdate = (clerkInstance) => {
      const activeUser = clerkInstance?.user;
      const savedUid = sessionStorage.getItem("admin_audit_uid");

      // 1. Si hay usuario autenticado -> guardar ID y registrar login una sola vez
      if (activeUser?.id) {
        sessionStorage.setItem("admin_audit_uid", activeUser.id);

        if (!sessionStorage.getItem("admin_login_logged")) {
          sessionStorage.setItem("admin_login_logged", "1");
          fetchConAuth("/mobil/audit/admin-login", {
            method: "POST",
          }).catch((err) => {
            sessionStorage.removeItem("admin_login_logged");
            console.error("Error registrando admin-login:", err);
          });
        }
        return;
      }

      // 2. Si había un admin logueado y ahora activeUser es null -> cerró sesión
      if (!activeUser && savedUid) {
        sessionStorage.removeItem("admin_audit_uid");
        sessionStorage.removeItem("admin_login_logged");

        const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
        fetch(`${apiBase}/mobil/audit/admin-logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          keepalive: true,
          body: JSON.stringify({
            clerk_user_id: savedUid,
            reason: "Cierre de sesión desde panel administrativo",
          }),
        }).catch((err) => console.error("Error registrando admin-logout:", err));
      }
    };

    const attachClerkListener = () => {
      const clerk = window.Clerk;
      if (!clerk || !clerk.loaded) return false;

      // Evaluar estado inicial
      handleClerkUpdate(clerk);

      // Suscribirse a cambios de sesión (login / logout desde UserButton)
      if (typeof clerk.addListener === "function") {
        unsubscribe = clerk.addListener(() => handleClerkUpdate(clerk));
      }
      return true;
    };

    // Esperar brevemente si window.Clerk aún está terminando de inicializar
    if (!attachClerkListener()) {
      pollTimer = setInterval(() => {
        if (attachClerkListener()) {
          clearInterval(pollTimer);
        }
      }, 200);
    }

    return () => {
      if (pollTimer) clearInterval(pollTimer);
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [fetchConAuth]);

  return (
    <div className="admin-layout-root">
      <AdminNavigation />
      <main className="admin-layout-main">{children}</main>
    </div>
  );
}