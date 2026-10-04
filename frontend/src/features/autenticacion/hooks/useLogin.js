import { useState } from "react";
import { useSignIn, useAuth, useClerk } from "@clerk/react";
import { useNavigate } from "react-router-dom";

export function useLogin() {
  const { signIn, setActive } = useSignIn();
  const { isLoaded } = useAuth();
  const clerk = useClerk();
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    if (!isLoaded) return;
    try {
      if (typeof signIn.authenticateWithRedirect === 'function') {
        await signIn.authenticateWithRedirect({
          strategy: "oauth_google",
          redirectUrl: "/sso-callback",
          redirectUrlComplete: "/",
        });
      } else if (typeof signIn.sso === 'function') {
        await signIn.sso({
          strategy: "oauth_google",
          redirectUrl: "/sso-callback",
          redirectUrlComplete: "/",
        });
      } else {
        await signIn.authenticateWithRedirect({
          strategy: "oauth_google",
          redirectUrl: "/sso-callback",
          redirectUrlComplete: "/",
        });
      }
    } catch (err) {
      console.error("Google Auth Error:", err);
      alert("Error al iniciar con Google: " + (err.errors?.[0]?.message || err.message || "Error desconocido."));
      setError("Error al iniciar con Google.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isLoaded) return;
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn.create({
        identifier: emailAddress,
        password,
        strategy: "password",
      });

      if (result?.error) {
        throw result.error;
      }

      const currentSignIn = clerk.client.signIn;

      if (currentSignIn.status === "complete" || currentSignIn.status === null) {
        setIsTransitioning(true); // Activa el loader a pantalla completa

        let sessionId = currentSignIn.createdSessionId;
        if (!sessionId && clerk.client.activeSessions && clerk.client.activeSessions.length > 0) {
          sessionId = clerk.client.activeSessions[0].id;
        }
        if (!sessionId && clerk.client.sessions && clerk.client.sessions.length > 0) {
          sessionId = clerk.client.sessions[0].id;
        }

        if (sessionId) {
          await clerk.setActive({ session: sessionId });
        } else {
          console.warn("No se encontró sessionId para activar la sesión en login.");
        }

        // Damos 1.6s para apreciar la animación completa
        setTimeout(() => {
          navigate("/");
        }, 1600);
      } else {
        console.error("Login incompleto. Objeto signIn:", currentSignIn);
        alert("Se requiere un paso adicional para iniciar sesión (2FA, etc.). Estado: " + currentSignIn.status);
        setError("Se requiere un paso adicional para iniciar sesión.");
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Error signing in:", err);
      const msg = err.errors?.[0]?.message || err.message || "Credenciales inválidas.";
      alert("Error al iniciar sesión: " + msg);
      setError(msg);
      setIsLoading(false);
    }
  };

  return {
    emailAddress,
    setEmailAddress,
    password,
    setPassword,
    error,
    isLoading,
    isTransitioning,
    handleGoogleSignIn,
    handleSubmit
  };
}
