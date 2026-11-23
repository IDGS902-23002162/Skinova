import React from "react";
import AdminNavigation from "./AdminNavigation";
import "./AdminLayout.css";

/**
 * AdminLayout — wrapper que coloca la navegación de admin
 * (sidebar en desktop, bottom-nav en móvil) y el contenido principal.
 */
export default function AdminLayout({ children }) {
  return (
    <div className="admin-layout-root">
      <AdminNavigation />
      <main className="admin-layout-main">{children}</main>
    </div>
  );
}

