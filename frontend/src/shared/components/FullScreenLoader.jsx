import React from "react";
import "./FullScreenLoader.css";

export default function FullScreenLoader({ isVisible, text = "Iniciando sesión..." }) {
  return (
    <div className={`full-screen-loader-overlay ${isVisible ? "visible" : ""}`}>
      <div className="bg"></div>
      <div className="bg bg2"></div>
      <div className="bg bg3"></div>
      
      <div className="loader-content">
        <div className="loader"></div>
        <p className="loader-text">{text}</p>
      </div>
    </div>
  );
}
