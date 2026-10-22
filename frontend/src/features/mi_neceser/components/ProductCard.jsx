import {
  Droplets,
  FlaskConical,
  Package,
  ShieldCheck,
  Sun,
} from "lucide-react";

const categoryIcons = {
  Limpiador: Droplets,
  Suero: FlaskConical,
  Hidratante: Package,
  "Protector solar": Sun,
  Tratamiento: ShieldCheck,
  Otro: Package,
};

const routineLabels = {
  morning: "Mañana",
  evening: "Noche",
  both: "Mañana y noche",
};

export default function ProductCard({ product }) {
  const Icon = categoryIcons[product.category] ?? Package;

  return (
    <article className="neceser-product-card">
      <div className="neceser-product-card-top">
        <span className="neceser-product-icon">
          <Icon size={22} aria-hidden="true" />
        </span>
      </div>

      <div className="neceser-product-copy">
        <span className="neceser-category">{product.category}</span>
        <h3>{product.name}</h3>
        {product.brand && <p className="neceser-product-brand">{product.brand}</p>}
      </div>

      <div className="neceser-product-meta">
        <span className="neceser-routine-badge">{routineLabels[product.routine]}</span>
        {product.expirationDate && (
          <span className="neceser-expiration">
            Caduca{" "}
            {new Date(`${product.expirationDate}T00:00:00`).toLocaleDateString(
              "es-MX",
              { day: "numeric", month: "short", year: "numeric" },
            )}
          </span>
        )}
      </div>

      {product.notes && <p className="neceser-product-notes">{product.notes}</p>}
    </article>
  );
}
