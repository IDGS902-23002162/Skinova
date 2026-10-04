import React from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { useLogin } from "../hooks/useLogin";
import FullScreenLoader from "../../../shared/components/FullScreenLoader";
import "./CustomAuth.css";

export default function SignInPage() {
  const {
    emailAddress,
    setEmailAddress,
    password,
    setPassword,
    error,
    isLoading,
    isTransitioning,
    handleGoogleSignIn,
    handleSubmit
  } = useLogin();

  return (
    <>
      <FullScreenLoader isVisible={isTransitioning} text="Preparando tu dashboard..." />
      <AuthLayout>
        <div className="custom-auth-form-container">
        <h1 className="custom-auth-title">Inicia sesión</h1>
        
        <button 
          className="custom-auth-social-btn" 
          onClick={handleGoogleSignIn}
          type="button"
        >
          <svg className="google-icon" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continúa con Google
        </button>

        <form onSubmit={handleSubmit} className="custom-auth-form">
          <div className="custom-auth-input-group">
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              placeholder="nombre@email.com"
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
              required
            />
          </div>
          
          <div className="custom-auth-input-group">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <div className="custom-auth-error">{error}</div>}

          <button 
            type="submit" 
            className="custom-auth-submit-btn"
            disabled={isLoading}
          >
            {isLoading ? "Iniciando..." : "Iniciar sesión"}
          </button>
        </form>

        <p className="custom-auth-footer-text">
          ¿No tienes una cuenta? <Link to="/sign-up">Regístrate</Link>
        </p>

        {/* Elemento requerido por Clerk para protección contra bots (Smart CAPTCHA) */}
        <div id="clerk-captcha"></div>
      </div>
    </AuthLayout>
    </>
  );
}
