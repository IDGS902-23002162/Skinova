import { useState } from "react";
import { Camera, ImagePlus } from "lucide-react";
import ProductCamera from "./ProductCamera";

const VERIFICATION_MESSAGES = {
  checked: "Se corroboraron o completaron datos con las fuentes del fabricante.",
  conflict: "Hay diferencias con la información del fabricante. La ficha conserva lo que indica el envase.",
  no_source: "No se encontró una fuente oficial para corroborar los datos de esta presentación.",
  unavailable: "La verificación web no estuvo disponible. Se guardó la información legible del envase.",
};

export function ProductVerification({ verification }) {
  if (!verification) return null;
  return (
    <>
      <p>{VERIFICATION_MESSAGES[verification.status]}</p>
      {verification.sources?.map((source) => (
        <p key={source.href}><a href={source.href} target="_blank" rel="noopener noreferrer">{source.name}</a></p>
      ))}
    </>
  );
}

export default function ProductPhotoForm({ product, onSave, front = false, replaceLabel = false }) {
  const [file, setFile] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const field = front ? "front" : "back";

  async function submit(event) {
    event.preventDefault();
    if (!file || saving) return;
    if (file.size > 8 * 1024 * 1024) {
      setError("La foto debe pesar como máximo 8 MB.");
      return;
    }
    const body = new FormData(event.currentTarget);
    body.set(field, file);
    if (replaceLabel) body.set("replace", "yes");
    await save(body);
  }

  async function save(body) {
    setSaving(true);
    setError("");
    try {
      await onSave(product, body);
      if (front) setSaved("Foto actualizada y ficha reevaluada.");
      if (replaceLabel) setSaved("Etiqueta actualizada y ficha reevaluada.");
      setFile(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function recheck() {
    const body = new FormData();
    body.set("recheck", "yes");
    return save(body);
  }

  if ((front || !product.back_image_url) && !onSave) return null;

  return (
    <section className="neceser-detail-section">
      {!front && !replaceLabel && <h3>Etiqueta trasera</h3>}
      {!front && !replaceLabel && product.back_image_url ? (
        <>
          <img className="neceser-back-photo" src={product.back_image_url} alt={`Etiqueta trasera de ${product.name}`} />
          <ProductVerification verification={product.label_verification} />
          {onSave && (
            <details>
              <summary>Cambiar foto de la etiqueta</summary>
              <ProductPhotoForm replaceLabel product={product} onSave={onSave} />
            </details>
          )}
          {onSave && !["checked", "conflict"].includes(product.label_verification?.status) && (
            <div className="neceser-detail-actions">
              <button type="button" disabled={saving} onClick={recheck}>
                {saving ? "Verificando etiqueta…" : "Verificar etiqueta en la web"}
              </button>
            </div>
          )}
          {error && <p className="neceser-error" role="alert">{error}</p>}
        </>
      ) : (
        <form className="neceser-label-form" onSubmit={submit}>
          <div className="neceser-photo-picker">
            <input aria-label={front ? "Elegir una nueva foto del frente" : "Elegir foto de la etiqueta"}
              type="file" accept="image/jpeg,image/png,image/webp" disabled={saving} onChange={(event) => {
                if (event.currentTarget.files[0]) {
                  setFile(event.currentTarget.files[0]);
                  setSaved("");
                }
                event.currentTarget.value = "";
              }} />
            <span className="neceser-photo-picker-action" aria-hidden="true">
              <ImagePlus size={19} /> {file ? "Elegir otra foto" : "Elegir foto"}
            </span>
            <span className="neceser-photo-filename" title={file?.name} aria-live="polite">
              {file?.name || "JPG, PNG o WebP · hasta 8 MB"}
            </span>
          </div>
          <button type="button" className="neceser-camera-button" disabled={saving} onClick={() => setCameraOpen(true)}>
            <Camera size={17} aria-hidden="true" /> Abrir cámara
          </button>
          <label className="neceser-label-consent">
            <input type="checkbox" name="own_photo" value="yes" required disabled={saving} />
            {product.catalog_id ? "Tomé esta foto y autorizo que se muestre en el catálogo de Skinova." : "Tomé esta foto del producto."}
          </label>
          <div className="neceser-detail-actions">
            <button type="submit" disabled={!file || saving}>
              {saving ? (front || replaceLabel ? "Comparando foto y verificando la ficha…" : "Verificando etiqueta…")
                : front || replaceLabel ? "Cambiar foto" : "Agregar etiqueta"}
            </button>
          </div>
          {error && <p className="neceser-error" role="alert">{error}</p>}
          {saved && <p role="status">{saved}</p>}
        </form>
      )}
      {cameraOpen && <ProductCamera label={front ? "Foto del frente" : "Foto de la etiqueta trasera"} onClose={() => setCameraOpen(false)}
        onCapture={(captured) => { setFile(captured); setSaved(""); setCameraOpen(false); }} />}
    </section>
  );
}
