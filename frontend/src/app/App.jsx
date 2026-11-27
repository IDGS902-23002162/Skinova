import React, { useEffect } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth, useUser, AuthenticateWithRedirectCallback } from "@clerk/react";
import SignInPage from "../features/autenticacion/pages/SignInPage";
import SignUpPage from "../features/autenticacion/pages/SignUpPage";
import NotFoundPage from "../shared/pages/NotFoundPage";
import FullScreenLoader from "../shared/components/FullScreenLoader";
import MaintenanceModal from "../shared/components/MaintenanceModal";
import { useAppConfig } from "../shared/hooks/useAppConfig";
import LogoutTransition from "../features/autenticacion/components/LogoutTransition";
import MainLayout from "../shared/components/MainLayout";
import { useApi } from "../shared/hooks/useApi";
import OnboardingGate from "../features/perfil_salud/components/onboarding/OnboardingGate";
import ConsultaIaView from "../features/consulta_ia/pages/consulta_ia";
import { ProfileProvider } from "../features/perfil_salud/hooks/useProfileData";
import AdminDashboard from "../features/mobil/dashboard/AdminDashboard";
import AdminLayout from "../features/mobil/components/AdminLayout";
import GestionUsuarios from "../features/mobil/gestion_usuarios/GestionUsuarios";
import Rendimiento from "../features/mobil/rendimiento/Rendimiento";
import Bitacora from "../features/mobil/bitacora/Bitacora";
import Administracion from "../features/mobil/administracion/Administracion";
import SubscriptionsPage from "../features/suscripciones/pages/SubscriptionsPage";
import RoutineCreatorPage from "../features/creador_rutinas/components/RoutineCreatorPage";
import EnvironmentalMonitorPage from "../features/monitoreo_ambiental/components/EnvironmentalMonitorPage";
import DirectorioDerma from "../features/directorio_dermatologos/components/DirectorioDerma";
import ModuloComunidadForo from "../features/comunidad_foro/pages/ModuloComunidadForo";
import ModuloHabitosDesafios from "../features/habitos_desafios/pages/ModuloHabitosDesafios";
import ModuloMiNeceser from "../features/mi_neceser/pages/ModuloMiNeceser";
import ModuloBitacoraProgreso from "../features/bitacora_progreso/pages/ModuloBitacoraProgreso";
import ModuloNotificaciones from "../features/notificaciones_alarmas/pages/ModuloNotificaciones";

const PATH_TO_MODULE = {
  "/": "dashboard",
  "/rutinas": "rutinas",
  "/consulta": "consulta_ia",
  "/neceser": "mi_neceser",
  "/progreso": "progreso",
  "/bitacora": "bitacora",
  "/habitos": "habitos",
  "/ambiente": "ambiente",
  "/comunidad": "comunidad",
  "/directorio": "directorio",
  "/notificaciones": "notificaciones",
  "/suscripciones": "suscripciones",
  "/subscriptions": "suscripciones",
};

const IGNORED_PREFIXES = [
  "/admin",
  "/sign-in",
  "/sign-up",
  "/sso-callback",
  "/logout-animation",
];

export function useTrackPwaVisits() {
  const location = useLocation();
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded) return;

    const cleanPath = location.pathname.toLowerCase();

    // Ignorar rutas de administración y autenticación
    if (IGNORED_PREFIXES.some((prefix) => cleanPath.startsWith(prefix))) {
      return;
    }

    // No registrar visitas cuando un admin entra temporalmente a "/" antes de redirigir a "/admin"
    if (user?.publicMetadata?.role === "admin") {
      return;
    }

    const matchedKey = Object.keys(PATH_TO_MODULE).find(
      (key) => key !== "/" && cleanPath.startsWith(key)
    );
    const moduleName = matchedKey
      ? PATH_TO_MODULE[matchedKey]
      : cleanPath === "/"
        ? "dashboard"
        : cleanPath.replace(/^\//, "").split("/")[0] || "general";

    // Normaliza la URL base (soporta VITE_API_URL definido o proxy relativo en Vite)
    const rawBaseUrl = import.meta.env.VITE_API_URL || "";
    const baseUrl = rawBaseUrl.replace(/\/+$/, "");

    fetch(`${baseUrl}/mobil/track-visit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        module_name: moduleName,
        path: location.pathname,
        user_id: user?.id || null,
      }),
    }).catch(() => { });
  }, [location.pathname, isLoaded, user?.id, user?.publicMetadata?.role]);
}

function AdminGuard({ children }) {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const { fetchConAuth } = useApi();

  useEffect(() => {
    if (isLoaded && isSignedIn && user?.publicMetadata?.role === "admin") {
      if (!sessionStorage.getItem("skinova_admin_login_logged")) {
        sessionStorage.setItem("skinova_admin_login_logged", "1");
        fetchConAuth("/mobil/audit/admin-login", { method: "POST" }).catch(() => {});
      }
    }
  }, [isLoaded, isSignedIn, user?.publicMetadata?.role, fetchConAuth]);

  if (!isLoaded) return <FullScreenLoader isVisible={true} text="Verificando permisos..." />;
  if (!isSignedIn) return <Navigate to="/sign-in" replace />;

  const role = user?.publicMetadata?.role;
  if (role !== "admin") return <Navigate to="/" replace />;

  return <AdminLayout>{children}</AdminLayout>;
}

function ProtectedModule({ children }) {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) return <FullScreenLoader isVisible={true} text="Cargando..." />;
  if (!isSignedIn) return <Navigate to="/sign-in" replace />;

  return (
    <OnboardingGate>
      <MainLayout>{children}</MainLayout>
    </OnboardingGate>
  );
}

function Home() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();

  if (!isLoaded) return <FullScreenLoader isVisible={true} text="Cargando..." />;
  if (!isSignedIn) return <Navigate to="/sign-in" replace />;

  if (user?.publicMetadata?.role === "admin") {
    return <Navigate to="/admin" replace />;
  }

  return (
    <OnboardingGate>
      <ProfileProvider>
        <MainLayout>
          <div style={{ padding: "1rem" }}>
            <header style={{ display: "flex", justifyContent: "space-between", marginBottom: "2rem" }}>
              <h1 style={{ color: "var(--bosque-profundo, #163B35)", fontFamily: "DM Serif Display, serif" }}>
                Dashboard
              </h1>
            </header>

            <div
              style={{
                backgroundColor: "var(--salvia, #A9C4B5)",
                padding: "2rem",
                borderRadius: "16px",
                color: "var(--bosque-profundo, #163B35)",
              }}
            >
              <h2>¡Bienvenido a Skinova!</h2>
              <p>Tu rutina de cuidado consciente comienza aquí.</p>
            </div>
          </div>
        </MainLayout>
      </ProfileProvider>
    </OnboardingGate>
  );
}

export default function App() {
  // <--- Aquí se activa el tracking en cada cambio de ruta
  useTrackPwaVisits();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useUser();
  const { config } = useAppConfig(location.pathname);
  const features = config.features;
  const isAdmin = user?.publicMetadata?.role === "admin";
  const path = location.pathname.toLowerCase();
  const skipGlobalMaintenance =
    isAdmin ||
    path.startsWith("/admin") ||
    path.startsWith("/sign-in") ||
    path.startsWith("/sso-callback") ||
    path.startsWith("/logout-animation");

  if (features.maintenance_mode && !skipGlobalMaintenance) {
    return <MaintenanceModal global />;
  }

  const guardModule = (flag, label, element) =>
    features[flag] === false && !isAdmin ? (
      <MaintenanceModal moduleName={label} onBack={() => navigate("/")} />
    ) : (
      element
    );

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/sign-in/*" element={<SignInPage />} />
      <Route path="/sign-up/*" element={<SignUpPage />} />
      <Route path="/admin" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
      <Route path="/admin/usuarios" element={<AdminGuard><GestionUsuarios /></AdminGuard>} />
      <Route path="/admin/rendimiento" element={<AdminGuard><Rendimiento /></AdminGuard>} />
      <Route path="/admin/bitacora" element={<AdminGuard><Bitacora /></AdminGuard>} />
      <Route path="/admin/administracion" element={<AdminGuard><Administracion /></AdminGuard>} />
      <Route path="/suscripciones" element={<SubscriptionsPage />} />
      <Route path="/subscriptions" element={<SubscriptionsPage />} />
      <Route path="/rutinas" element={<RoutineCreatorPage />} />
      <Route path="/ambiente" element={<EnvironmentalMonitorPage />} />
      <Route path="/directorio" element={guardModule("directorio", "Directorio de dermatólogos", <DirectorioDerma />)} />
      <Route path="/comunidad" element={guardModule("comunidad", "Comunidad / Foro", <ProtectedModule><ModuloComunidadForo /></ProtectedModule>)} />
      <Route path="/habitos" element={<ProtectedModule><ModuloHabitosDesafios /></ProtectedModule>} />
      <Route path="/neceser" element={<ProtectedModule><ModuloMiNeceser /></ProtectedModule>} />
      <Route path="/consulta" element={guardModule("consulta_ia", "Consulta IA", <ConsultaIaView />)} />
      <Route path="/progreso" element={<ModuloBitacoraProgreso />} />
      <Route path="/notificaciones" element={<ModuloNotificaciones />} />
      <Route
        path="/sso-callback"
        element={
          <>
            <FullScreenLoader
              isVisible={true}
              text="Autenticando con Google..."
            />

            <AuthenticateWithRedirectCallback
              transferable={true}
              signInUrl="/sign-in"
              signUpUrl="/sign-up"
              signUpFallbackRedirectUrl="/"
              signInFallbackRedirectUrl="/"
            />
          </>
        }
      />
      <Route path="/logout-animation" element={<LogoutTransition />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
