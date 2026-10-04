import React from "react";
import Navigation from "./Navigation";

export default function MainLayout({ children }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "var(--crema, #F6F3EC)" }}>
      <Navigation />
      <main style={{ 
        flex: 1, 
        padding: "24px",
        paddingBottom: "100px", // space for mobile bottom bar
        maxWidth: "1280px",
        margin: "0 auto",
        width: "100%",
        boxSizing: "border-box"
      }}>
        {children}
      </main>
    </div>
  );
}
