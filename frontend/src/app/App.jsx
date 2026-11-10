import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth, useUser, UserButton, AuthenticateWithRedirectCallback } from "@clerk/react";
import SignInPage from "../features/autenticacion/pages/SignInPage";
import SignUpPage from "../features/autenticacion/pages/SignUpPage";
import NotFoundPage from "../shared/pages/NotFoundPage";
import FullScreenLoader from "../shared/components/FullScreenLoader";
import LogoutTransition from "../features/autenticacion/components/LogoutTransition";
import MainLayout from "../shared/components/MainLayout";
import { Heart, Target, AlertTriangle } from "lucide-react";
import OnboardingGate from "../features/perfil_salud/components/onboarding/OnboardingGate";
import { ProfileProvider } from "../features/perfil_salud/hooks/useProfileData";
import CustomProfileModal from "../features/perfil_salud/components/profile/CustomProfileModal";
import AdminDashboard from "../features/mobil/dashboard/AdminDashboard";
import AdminLayout from "../features/mobil/components/AdminLayout";
import GestionUsuarios from "../features/mobil/gestion_usuarios/GestionUsuarios";
import Rendimiento from "../features/mobil/rendimiento/Rendimiento";
import Bitacora from "../features/mobil/bitacora/Bitacora";
import Administracion from "../features/mobil/administracion/Administracion";

// Protege /admin y sub-rutas: solo usuarios con publicMetadata.role === "admin"
function AdminGuard({ children }) {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();

  if (!isLoaded) return <FullScreenLoader isVisible={true} text="Verificando permisos..." />;
  if (!isSignedIn) return <Navigate to="/sign-in" replace />;

  const role = user?.publicMetadata?.role;
  if (role !== "admin") return <Navigate to="/" replace />;

  return <AdminLayout>{children}</AdminLayout>;
}
import ProfilePage from "../features/perfil_salud/pages/ProfilePage";
import SubscriptionsPage from "../features/suscripciones/pages/SubscriptionsPage";


function Home() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  if (!isLoaded) return <FullScreenLoader isVisible={true} text="Cargando..." />;
  if (!isSignedIn) return <Navigate to="/sign-in" replace />;

  // Si el usuario tiene role === "admin" en publicMetadata, redirigimos al panel admin.
  // Esto se evalúa AQUÍ porque useUser() ya tiene el objeto User completo y actualizado.
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
              <UserButton
                appearance={{
                  variables: {
                    colorPrimary: '#2D6658', // bosque-medio
                    colorText: '#1D2825', // carbon
                    colorBackground: '#F6F3EC', // crema
                    colorDanger: '#C98268', // terracota
                    borderRadius: '12px'
                  },
                  elements: {
                    card: {
                      boxShadow: '0 4px 20px rgba(29,40,37,0.08)'
                    }
                  }
                }}
              >
                <UserButton.MenuItems>
                  <UserButton.Action
                    label="Mi Perfil Skinova"
                    labelIcon={<Heart size={16} />}
                    onClick={() => setIsProfileModalOpen(true)}
                  />
                  <UserButton.Action label="manageAccount" />
                  <UserButton.Action label="signOut" />
                </UserButton.MenuItems>
              </UserButton>
            </header>

            <ProfilePage
              isOpen={isProfileModalOpen}
              onClose={() => setIsProfileModalOpen(false)}
            />

            <div style={{
              backgroundColor: "var(--salvia, #A9C4B5)",
              padding: "2rem",
              borderRadius: "16px",
              color: "var(--bosque-profundo, #163B35)"
            }}>
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