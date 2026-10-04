import { useState } from "react";
import { useSignUp, useAuth, useClerk } from "@clerk/react";
import { useNavigate } from "react-router-dom";

export function useRegister() {
  const { signUp, setActive } = useSignUp();
  const { isLoaded } = useAuth();
  const clerk = useClerk();
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const navigate = useNavigate();

  const handleGoogleSignUp = async () => {
    if (!isLoaded) return;
    try {
      if (typeof signUp.authenticateWithRedirect === 'function') {
        await signUp.authenticateWithRedirect({
          strategy: "oauth_google",
          redirectUrl: "/sso-callback",
          redirectUrlComplete: "/",
        });
      } else if (typeof signUp.sso === 'function') {
        await signUp.sso({
          strategy: "oauth_google",
          redirectUrl: "/sso-callback",
          redirectUrlComplete: "/",
        });
      } else {
        await signUp.authenticateWithRedirect({
          strategy: "oauth_google",
          redirectUrl: "/sso-callback",
          redirectUrlComplete: "/",
        });
      }
    } catch (err) {
      console.error("Google Auth Error:", err);
      alert("Error al registrar con Google: " + (err.errors?.[0]?.message || err.message || "Error desconocido."));
      setError("Error al registrar con Google.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isLoaded) return;
    setIsLoading(true);
    setError("");

    try {
      console.log("Iniciando signUp.create con:", { emailAddress, password });
      const signUpResult = await signUp.create({
        emailAddress,
        password,
      });

      console.log("signUp.create exitoso. Resultado crudo:", signUpResult);
      console.log("Métodos disponibles en signUp:", Object.keys(signUp));
      console.log("Prototipo de signUp:", Object.keys(Object.getPrototypeOf(signUp)));

      // NUEVO: En Clerk v6, create() no arroja error si la validación falla (ej. contraseña débil), 
      // sino que devuelve un objeto con la propiedad "error".
      if (signUpResult?.error) {
        throw signUpResult.error;
      }

      const currentSignUp = clerk.client.signUp;
      console.log("Estado de currentSignUp en client:", currentSignUp);

      // Si no requiere verificación, ya está completo
      if (currentSignUp.status === "complete") {
        await clerk.setActive({ session: currentSignUp.createdSessionId });
        navigate("/");
        return;
      }

      // Si requiere verificación, preparamos el código
      let prepared = false;

      try {
        console.log("Intentando signUp.prepareEmailAddressVerification...");
        await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
        prepared = true;
      } catch (e) {
        if (!(e instanceof TypeError)) throw e; // Si es un error de Clerk (ej. 429), lo lanzamos
      }

      if (!prepared) {
        try {
          console.log("Intentando signUpResult.prepareEmailAddressVerification...");
          await signUpResult.prepareEmailAddressVerification({ strategy: "email_code" });
          prepared = true;
        } catch (e) {
          if (!(e instanceof TypeError)) throw e;
        }
      }

      if (!prepared) {
        try {
          console.log("Intentando signUp.prepareVerification...");
          await signUp.prepareVerification({ strategy: "email_code" });
          prepared = true;
        } catch (e) {
          if (!(e instanceof TypeError)) throw e;
        }
      }

      if (!prepared && signUp.verifications) {
        try {
          console.log("Intentando signUp.verifications.prepareEmailAddressVerification...");
          await signUp.verifications.prepareEmailAddressVerification({ strategy: "email_code" });
          prepared = true;
        } catch (e) {
          if (!(e instanceof TypeError)) throw e;
        }
      }

      if (!prepared && signUp.verifications) {
        try {
          console.log("Intentando signUp.verifications.sendEmailCode...");
          await signUp.verifications.sendEmailCode();
          prepared = true;
        } catch (e) {
          if (!(e instanceof TypeError)) throw e;
        }
      }

      if (!prepared) {
        console.warn("ADVERTENCIA CRÍTICA: No se encontró NINGÚN método para preparar el email. Verifica la consola.");
        console.log("Métodos en signUp:", Object.keys(signUp));
        console.log("Métodos en signUpResult:", Object.keys(signUpResult));
        if (signUp.verifications) {
          console.log("Keys en signUp.verifications:", Object.keys(signUp.verifications));
          console.log("¿Existe emailAddress en verifications?:", !!signUp.verifications.emailAddress);
          if (signUp.verifications.emailAddress) {
            console.log("Keys en signUp.verifications.emailAddress:", Object.keys(signUp.verifications.emailAddress));
          }
        }
      }

      setPendingVerification(true);
    } catch (err) {
      console.error("Error signing up (CAPTURADO POR CATCH):", err);
      if (err.errors) console.error("Detalles del error 422:", err.errors);

      const msg = err.errors?.[0]?.message || err.message || "Error al crear la cuenta.";
      alert("Error en el registro: " + msg);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const onPressVerify = async (e) => {
    e.preventDefault();
    if (!isLoaded) return;
    setIsLoading(true);
    setError("");

    try {
      let completeSignUp;
      let attempted = false;

      try {
        console.log("Intentando signUp.attemptEmailAddressVerification...");
        completeSignUp = await signUp.attemptEmailAddressVerification({ code });
        attempted = true;
      } catch (e) {
        if (!(e instanceof TypeError)) throw e;
      }

      if (!attempted) {
        try {
          console.log("Intentando signUp.attemptVerification...");
          completeSignUp = await signUp.attemptVerification({ strategy: "email_code", code });
          attempted = true;
        } catch (e) {
          if (!(e instanceof TypeError)) throw e;
        }
      }

      if (!attempted && signUp.verifications) {
        try {
          console.log("Intentando signUp.verifications.attemptEmailAddressVerification...");
          completeSignUp = await signUp.verifications.attemptEmailAddressVerification({ code });
          attempted = true;
        } catch (e) {
          if (!(e instanceof TypeError)) throw e;
        }
      }

      if (!attempted && signUp.verifications) {
        try {
          console.log("Intentando signUp.verifications.verifyEmailCode...");
          completeSignUp = await signUp.verifications.verifyEmailCode({ code });
          attempted = true;
        } catch (e) {
          if (!(e instanceof TypeError)) throw e;
        }
      }

      if (!attempted) {
        alert("El formulario de verificación expiró o no es válido. Intenta registrarte de nuevo.");
        setIsLoading(false);
        return;
      }

      if (completeSignUp?.error) {
        throw completeSignUp.error;
      }

      const currentSignUp = clerk.client.signUp;

      // Si el estado es "complete" o si es "null" (lo cual en Clerk v6 puede indicar que la cuenta
      // se creó con éxito y el objeto fue limpiado), verificamos si podemos iniciar sesión.
      if (currentSignUp.status === "complete" || currentSignUp.status === null) {
        setIsTransitioning(true);

        let sessionId = currentSignUp.createdSessionId;
        if (!sessionId && clerk.client.activeSessions && clerk.client.activeSessions.length > 0) {
          sessionId = clerk.client.activeSessions[0].id;
        }
        if (!sessionId && clerk.client.sessions && clerk.client.sessions.length > 0) {
          sessionId = clerk.client.sessions[0].id;
        }

        if (sessionId) {
          await clerk.setActive({ session: sessionId });
        } else {
          console.warn("No se encontró sessionId para activar la sesión.");
        }

        setTimeout(() => {
          navigate("/");
        }, 2200);
      } else {
        alert("La verificación no está completa. Estado: " + currentSignUp.status);
        setError("La verificación no está completa.");
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Error verifying:", err);
      const msg = err.errors?.[0]?.message || err.message || "Código incorrecto.";
      alert("Error en la verificación: " + msg);
      setError(msg);
      setIsLoading(false);
    }
  };

  return {
    emailAddress,
    setEmailAddress,
    password,
    setPassword,
    pendingVerification,
    code,
    setCode,
    error,
    isLoading,
    isTransitioning,
    handleGoogleSignUp,
    handleSubmit,
    onPressVerify
  };
}
