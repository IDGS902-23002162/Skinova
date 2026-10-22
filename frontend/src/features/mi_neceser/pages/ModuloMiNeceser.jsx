import { useState } from "react";
import ProductCard from "../components/ProductCard";
import RoutineSelector from "../components/RoutineSelector";
import "./MiNeceser.css";

const sampleProducts = [
  {
    id: "cleanser",
    name: "Limpiador facial suave",
    brand: "Cuidado diario",
    category: "Limpiador",
    routine: "both",
  },
  {
    id: "serum",
    name: "Suero hidratante",
    brand: "Hidratación",
    category: "Suero",
    routine: "morning",
  },
  {
    id: "moisturizer",
    name: "Crema hidratante",
    brand: "Hidratación",
    category: "Hidratante",
    routine: "both",
  },
  {
    id: "sunscreen",
    name: "Protector solar",
    brand: "Protección diaria",
    category: "Protector solar",
    routine: "morning",
  },
  {
    id: "treatment",
    name: "Tratamiento nocturno",
    brand: "Cuidado de noche",
    category: "Tratamiento",
    routine: "evening",
  },
];

export default function ModuloMiNeceser() {
  const [routine, setRoutine] = useState("morning");
  const [isAllSelected, setIsAllSelected] = useState(true);

  const visibleProducts = sampleProducts.filter(
    (product) =>
      isAllSelected ||
      product.routine === routine ||
      product.routine === "both",
  );

  return (
    <div className="neceser-page">
      <header className="neceser-header">
        <div>
          <p className="neceser-eyebrow">TU CUIDADO, A TU MANERA</p>
          <h1>Mi neceser</h1>
          <p className="neceser-intro">
            Explora los productos de ejemplo según el momento de tu rutina.
          </p>
        </div>
      </header>

      <section
        className="neceser-products-section"
        aria-labelledby="products-title"
      >
        <div className="neceser-section-heading">
          <div>
            <h2 id="products-title">Tus productos</h2>
            <p>Selecciona una rutina para ver sus productos.</p>
          </div>
        </div>

        <div className="neceser-toolbar">
          <RoutineSelector
            value={routine}
            onChange={(nextRoutine) => {
              setRoutine(nextRoutine);
              setIsAllSelected(false);
            }}
            onSelectAll={() => setIsAllSelected(true)}
            isAllSelected={isAllSelected}
          />
          <span className="neceser-result-count" aria-live="polite">
            {visibleProducts.length}{" "}
            {visibleProducts.length === 1 ? "producto" : "productos"}
          </span>
        </div>

        <div className="neceser-product-grid">
          {visibleProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
}
