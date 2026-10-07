import React, { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth, UserButton, AuthenticateWithRedirectCallback } from "@clerk/react";
import SignInPage from "../features/autenticacion/pages/SignInPage";
import SignUpPage from "../features/autenticacion/pages/SignUpPage";
import NotFoundPage from "../shared/pages/NotFoundPage";
import FullScreenLoader from "../shared/components/FullScreenLoader";
import LogoutTransition from "../features/autenticacion/components/LogoutTransition";
import MainLayout from "../shared/components/MainLayout";
import { Heart, Target, AlertTriangle } from "lucide-react";
import MiPielTab from "../features/perfil_salud/pages/MiPielTab";
import RestriccionesTab from "../features/perfil_salud/pages/RestriccionesTab";
import OnboardingGate from "../features/perfil_salud/components/onboarding/OnboardingGate";
import { ProfileProvider } from "../features/perfil_salud/hooks/useProfileData";

function Home() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) return <FullScreenLoader isVisible={true} text="Cargando..." />;
  if (!isSignedIn) return <Navigate to="/sign-in" replace />;

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
                  },
                  navbar: {
                    borderRight: '1px solid #E7DFD2' // arena
                  }
                }
              }}
            >
              <UserButton.UserProfilePage 
                label="Mi Piel" 
                url="mi-piel" 
                labelIcon={<Heart size={16} />}
              >
                <MiPielTab />
              </UserButton.UserProfilePage>
              <UserButton.UserProfilePage 
                label="Restricciones" 
                url="restricciones" 
                labelIcon={<AlertTriangle size={16} />}
              >
                <RestriccionesTab />
              </UserButton.UserProfilePage>
            </UserButton>
          </header>
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