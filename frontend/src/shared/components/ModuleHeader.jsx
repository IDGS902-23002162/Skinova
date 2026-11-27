import "../styles/ModuleLayout.css";

export default function ModuleHeader({ title, description, children }) {
  return (
    <header className="skinova-module-header">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </header>
  );
}
