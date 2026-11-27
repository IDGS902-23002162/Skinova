import { useState } from "react";
import { ArrowUpRight, Package } from "lucide-react";
import { displayImageUrl } from "../catalogImage";

export default function ProductCard({ product, onSelect }) {
  const [imageFailed, setImageFailed] = useState(false);
  const [useOriginal, setUseOriginal] = useState(false);
  return (
    <button type="button" className="neceser-product-card" onClick={() => onSelect(product)}
      title={product.name}
      aria-label={`Ver detalles de ${product.name}${product.brand ? `, ${product.brand}` : ""}`}>
      <span className="neceser-product-photo">
        <span className="neceser-product-photo-label">{product.id ? "En mi neceser" : "Catálogo"}</span>
        {product.image_url && !imageFailed ? (
          <img src={displayImageUrl(product, useOriginal)} alt="" loading="lazy" referrerPolicy="no-referrer"
            onError={() => { if (!useOriginal && product.display_image_url) setUseOriginal(true); else setImageFailed(true); }} />
        ) : (
          <span className="neceser-product-no-photo"><Package size={32} aria-hidden="true" /> Foto no disponible</span>
        )}
      </span>
      <span className="neceser-product-caption">
        <span className="neceser-product-brand">{product.brand || "Marca no indicada"}</span>
        <strong>{product.name}</strong>
        {product.quantity && <span className="neceser-product-quantity">{product.quantity}</span>}
        <span className="neceser-product-link">Ver ficha <ArrowUpRight size={16} aria-hidden="true" /></span>
      </span>
    </button>
  );
}
