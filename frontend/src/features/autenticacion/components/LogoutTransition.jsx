import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import FullScreenLoader from "../../../shared/components/FullScreenLoader";

export default function LogoutTransition() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/sign-in");
    }, 700);

    return () => clearTimeout(timer);
  }, [navigate]);

  return <FullScreenLoader isVisible={true} text="Cerrando sesión..." />;
}
