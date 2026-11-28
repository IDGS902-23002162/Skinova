import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Heart, Package } from "lucide-react";
import { useMotionDuration } from "../../../shared/hooks/useMotionDuration";
import { displayImageUrl } from "../catalogImage";

export default function ProductCard({ product, onSelect, saved, busy, onToggleSaved }) {
  const [imageFailed, setImageFailed] = useState(false);
  const [useOriginal, setUseOriginal] = useState(false);
  const heartRef = useRef(null);
  const previousSaved = useRef(saved);
  const motionDuration = useMotionDuration();
  const action = saved ? "Quitar de mi neceser" : "Agregar a mi neceser";

  useEffect(() => {
    if (previousSaved.current === saved) return;
    previousSaved.current = saved;
    if (!motionDuration || !heartRef.current?.animate) return;
    const animation = heartRef.current.animate(
      [{ transform: "scale(1)" }, { transform: saved ? "scale(1.3)" : "scale(.76)" }, { transform: "scale(1)" }],
      { duration: motionDuration, easing: "ease-out" },
    );
    return () => animation.cancel();
  }, [saved, motionDuration]);

  return (
    <>
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
      <button type="button" className="neceser-product-heart" title={action}
        aria-label={`${action}: ${product.name}`} aria-pressed={saved}
        disabled={busy} onClick={onToggleSaved}>
        <span ref={heartRef}><Heart size={21} aria-hidden="true" /></span>
      </button>
    </>
  );
}
