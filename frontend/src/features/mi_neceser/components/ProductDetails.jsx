import { useEffect, useRef, useState } from "react";
import Fade from "@mui/material/Fade";
import { ExternalLink, Package, Plus, Trash2, X } from "lucide-react";
import { displayImageUrl } from "../catalogImage";
import { useMotionDuration } from "../../../shared/hooks/useMotionDuration";
import ProductPhotoForm, { ProductVerification } from "./ProductPhotoForm";
import StoreSearch from "./StoreSearch";

const AAD_ORDER = "https://www.aad.org/public/everyday-care/skin-care-basics/care/apply-skin-care-certain-order";
const AAD_TEST = "https://www.aad.org/public/everyday-care/skin-care-secrets/prevent-skin-problems/test-skin-care-products";
const AAD_SUNSCREEN = "https://www.aad.org/public/everyday-care/sun-protection/shade-clothing-sunscreen/how-to-apply-sunscreen";
const AAD_WASH = "https://www.aad.org/public/everyday-care/skin-care-basics/care/face-washing-101";
const AAD_MOISTURIZER = "https://www.aad.org/public/everyday-care/skin-care-basics/care/skin-care-budget";
const AAD_BEARD = "https://www.aad.org/public/everyday-care/skin-care-secrets/face/healthy-beard/";

function guidanceFor(product) {
  const text = `${product.category || ""} ${product.name || ""} ${product.brand || ""}`.toLowerCase();
  if (/protector solar|sunscreen|sunblock|spf|fps|solaire|fotoprotector/.test(text)) {
    return {
      recommendation: "Busca en la etiqueta protección de amplio espectro y FPS 30 o superior; la ficha del catálogo no confirma esas características.",
      usage: "Como orientación general, aplícalo antes de salir y reaplícalo cada dos horas al aire libre, o después de nadar o sudar.",
      source: AAD_SUNSCREEN,
    };
  }
  if (/beard|barba|barbe|bart/.test(text)) {
    if (/shampoo|shamp|champú|wash|cleanser|soap|limpiador|gel de limpieza/.test(text)) {
      return {
        recommendation: "Elige un limpiador suave según tu tipo de piel y revisa las indicaciones del envase.",
        usage: "Lava con suavidad la barba y la piel debajo; enjuaga bien con agua tibia y seca sin frotar.",
        source: AAD_BEARD,
      };
    }
    return {
      recommendation: "Para piel normal o seca, un aceite para barba puede ayudar a acondicionarla; si tu piel es propensa al acné, considera un acondicionador no comedogénico.",
      usage: "Tras lavar la barba, usa poca cantidad y distribúyela por el vello y la piel debajo. Sigue siempre la cantidad y frecuencia del envase.",
      source: AAD_BEARD,
    };
  }
  if (/limpiador|cleanser|cleansing|face wash|nettoyant|reinig|gel lavant/.test(text)) {
    return {
      recommendation: "Elige un limpiador suave adecuado para tu piel y revisa las indicaciones del envase.",
      usage: "Como orientación general, humedece el rostro con agua tibia y limpia suavemente con las yemas de los dedos.",
      source: AAD_WASH,
    };
  }
  if (/hidrat|moistur|cr[eè]me|crema|lotion|loción/.test(text)) {
    return {
      recommendation: "Elige un hidratante adecuado para tu tipo de piel y revisa las indicaciones del envase.",
      usage: "Como orientación general, aplícalo sobre la piel ligeramente húmeda; sigue la cantidad y frecuencia del envase.",
      source: AAD_MOISTURIZER,
    };
  }
  return {
    recommendation: "Evita añadir demasiados productos nuevos a la vez, ya que pueden irritar la piel.",
    usage: "Sigue el método y la frecuencia indicados en el envase. Como orden general: limpieza, tratamiento y después hidratante o protector solar.",
    source: AAD_ORDER,
  };
}

const ROUTINE_LABELS = {
  morning: "Mañana",
  evening: "Noche",
  both: "Mañana y noche",
};

export default function ProductDetails({ product, catalog, added, busy, onClose, onAdd, onRemove, onChangeRoutine, onSaveLabel, onReplacePhoto }) {
  const motionDuration = useMotionDuration();
  const dialogRef = useRef(null);
  const [routine, setRoutine] = useState(product.routine || "both");
  const [savingRoutine, setSavingRoutine] = useState(false);
  const [routineError, setRoutineError] = useState("");
  const [addError, setAddError] = useState("");
  const [imageFailed, setImageFailed] = useState(false);
  const [useOriginal, setUseOriginal] = useState(false);
  const [photoExpanded, setPhotoExpanded] = useState(false);
  const guidance = guidanceFor(product);

  async function saveRoutine(value) {
    setSavingRoutine(true);
    setRoutineError("");
    try {
      await onChangeRoutine(product, value);
    } catch (err) {
      setRoutineError(err.message);
    } finally {
      setSavingRoutine(false);
    }
  }

  async function saveProduct() {
    setAddError("");
    try {
      await onAdd(product, routine);
    } catch (err) {
      setAddError(err.message);
    }
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, []);

  return (
    <Fade in timeout={motionDuration}>
      <dialog ref={dialogRef} className="neceser-detail-dialog"
        onCancel={(event) => { event.preventDefault(); onClose(); }}
        onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
        aria-labelledby="neceser-detail-title">
        <div className="neceser-detail-content">
          <button type="button" className="neceser-detail-close" onClick={onClose} aria-label="Cerrar ficha"><X size={20} /></button>
          <div className="neceser-detail-hero">
            <div className="neceser-detail-image">
              {product.image_url && !imageFailed ? (
                <button type="button" className="neceser-expand-photo" onClick={() => setPhotoExpanded(true)}
                  aria-label={`Ver foto de ${product.name} en pantalla completa`}>
                  <img src={displayImageUrl(product, useOriginal)} alt={`Envase de ${product.name}`} referrerPolicy="no-referrer"
                    onError={() => { if (!useOriginal && product.display_image_url) setUseOriginal(true); else setImageFailed(true); }} />
                  <span>Ampliar foto</span>
                </button>
              ) : <Package size={48} aria-label="Sin fotografía del producto disponible" />}
            </div>
            <div>
              <p className="neceser-detail-brand">{product.brand || "Producto de cuidado personal"}</p>
              <h2 id="neceser-detail-title">{product.name}</h2>
              {product.category && <p>{product.category}</p>}
              <div className="neceser-detail-facts">
                {ROUTINE_LABELS[product.routine] && (
                  <span className="neceser-detail-routine-badge"><strong>Rutina</strong> · {ROUTINE_LABELS[product.routine]}</span>
                )}
                {product.quantity && <span>Contenido: {product.quantity}</span>}
                {(product.code || product.catalog_code) && <span>Código: {product.code || product.catalog_code}</span>}
              </div>
            </div>
          </div>

          {photoExpanded && <dialog className="neceser-full-photo" aria-label={`Foto de ${product.name}`}
            ref={(dialog) => { if (dialog && !dialog.open) dialog.showModal(); }}
            onCancel={(event) => { event.preventDefault(); event.stopPropagation(); setPhotoExpanded(false); }}>
            <button type="button" className="neceser-detail-close" onClick={() => setPhotoExpanded(false)}
              aria-label="Cerrar imagen"><X size={22} /></button>
            <img src={displayImageUrl(product, useOriginal)} alt={`Envase de ${product.name}`} />
          </dialog>}
          {!catalog && product.has_personal_photo && (
            <details className="neceser-detail-section">
              <summary>Cambiar foto del frente</summary>
              <ProductPhotoForm front product={product} onSave={onReplacePhoto} />
            </details>
          )}
          <ProductPhotoForm product={product} onSave={!catalog && product.has_personal_photo ? onSaveLabel : null} />
          {!product.back_image_url && product.label_verification && (
            <section className="neceser-detail-section">
              <h3>Verificación de la ficha</h3>
              <ProductVerification verification={product.label_verification} />
            </section>
          )}
          {product.has_personal_photo && (
            <section className="neceser-detail-section">
              <h3>Advertencias del producto</h3>
              <p className="neceser-product-warnings">{product.warnings || "Consulta el envase para ver las precauciones de este producto."}</p>
            </section>
          )}
          <section className="neceser-detail-section">
            <h3>Ingredientes</h3>
            {product.has_personal_photo ? (
              <>
                <p>{product.ingredients_es || product.inci || "No se pudo confirmar la lista de ingredientes. Consulta la etiqueta del envase."}</p>
                {product.ingredients_es && product.inci && <details><summary>Ver lista INCI original</summary><p>{product.inci}</p></details>}
              </>
            ) : product.ingredients_es ? (
              <p>{product.ingredients_es}</p>
            ) : (
              <>
                <p>Esta ficha no incluye una lista de ingredientes en español. Consulta la etiqueta del envase.</p>
                {product.inci && <details><summary>Ver lista INCI original</summary><p>{product.inci}</p></details>}
              </>
            )}
          </section>

          <div className="neceser-detail-columns">
            <section className="neceser-detail-section">
              <h3>Recomendaciones generales</h3>
              <p>{guidance.recommendation}</p>
              <a href={guidance.source} target="_blank" rel="noopener noreferrer">Fuente: Academia Americana de Dermatología <ExternalLink size={13} /></a>
            </section>
            <section className="neceser-detail-section">
              <h3>Método de uso orientativo</h3>
              <p>{guidance.usage}</p>
              <p className="neceser-detail-muted">Para este producto, sigue las instrucciones del fabricante en el envase.</p>
            </section>
          </div>

          <section className="neceser-detail-section">
            <h3>Advertencias generales</h3>
            <p>Antes de incorporarlo a tu rutina, prueba una pequeña zona de piel. Si aparece una reacción, suspende su uso y consulta a un dermatólogo si es intensa o persistente.</p>
            <a href={AAD_TEST} target="_blank" rel="noopener noreferrer">Fuente: Academia Americana de Dermatología <ExternalLink size={13} /></a>
          </section>

          {product.has_personal_photo && (
            <section className="neceser-detail-section">
              <h3>Posibles efectos secundarios</h3>
              <p>{product.side_effects || "No pudimos confirmar efectos secundarios específicos. Revisa las advertencias del envase."}</p>
            </section>
          )}
          <section className="neceser-detail-section">
            <h3>Dónde comprarlo</h3>
            {Boolean(product.purchase_links?.length) && (
              <div className="neceser-buy-links">
                {product.purchase_links.map((link) => (
                  <a key={link.name} href={link.href} target="_blank" rel="noopener noreferrer">Ver producto en {link.name} <ExternalLink size={13} /></a>
                ))}
              </div>
            )}
            <StoreSearch initialQuery={[product.brand, product.name, product.quantity].filter(Boolean).join(" ")} />
          </section>
          {catalog ? (
            <div className="neceser-detail-actions">
              <label htmlFor="neceser-detail-routine">Rutina</label>
              <select id="neceser-detail-routine" value={routine} onChange={(event) => setRoutine(event.target.value)} disabled={busy || added}>
                <option value="both">Mañana y noche</option>
                <option value="morning">Mañana</option>
                <option value="evening">Noche</option>
              </select>
              {addError && <p role="alert" className="neceser-error">{addError}</p>}
              <button type="button" onClick={saveProduct} disabled={busy || added}>
                <Plus size={16} /> {added ? "En tu neceser" : busy ? "Agregando..." : "Agregar a mi neceser"}
              </button>
            </div>
          ) : (
            <div className="neceser-detail-actions">
              <label htmlFor="neceser-saved-routine">Rutina</label>
              <select id="neceser-saved-routine" value={product.routine} disabled={busy || savingRoutine}
                onChange={(event) => saveRoutine(event.target.value)}>
                <option value="both">Mañana y noche</option>
                <option value="morning">Mañana</option>
                <option value="evening">Noche</option>
              </select>
              {routineError && <p role="alert" className="neceser-error">{routineError}</p>}
              <button type="button" className="neceser-detail-remove" onClick={() => onRemove(product)} disabled={busy || savingRoutine}>
                <Trash2 size={15} /> {busy ? "Quitando..." : "Quitar del neceser"}
              </button>
            </div>
          )}
        </div>
      </dialog>
    </Fade>
  );
}
