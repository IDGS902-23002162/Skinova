import { useCallback, useEffect, useState } from "react";
import Collapse from "@mui/material/Collapse";
import Fade from "@mui/material/Fade";
import { ImagePlus, Megaphone, Pencil, Settings2, Trash2 } from "lucide-react";
import { useApi } from "../../../shared/hooks/useApi";
import { useMotionDuration } from "../../../shared/hooks/useMotionDuration";
import ForumImage from "./ForumImage";
import ForumSentAt from "./ForumSentAt";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

async function readJson(response, fallback) {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || fallback);
  return data;
}

export default function ModeratorBulletins() {
  const { fetchConAuth } = useApi();
  const motionDuration = useMotionDuration();
  const [bulletins, setBulletins] = useState([]);
  const [isModerator, setIsModerator] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [removeImage, setRemoveImage] = useState(false);
  const [imageError, setImageError] = useState("");

  useEffect(() => {
    if (!selectedImage) {
      setPreviewUrl("");
      return undefined;
    }
    const url = URL.createObjectURL(selectedImage);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedImage]);

  function startEditing(id) {
    setEditingId(id);
    setSelectedImage(null);
    setPreviewUrl("");
    setRemoveImage(false);
    setImageError("");
    setError("");
  }

  function selectImage(event) {
    const file = event.target.files?.[0];
    if (!file) {
      setSelectedImage(null);
      setPreviewUrl("");
      setImageError("");
      return;
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_SIZE) {
      setSelectedImage(null);
      setPreviewUrl("");
      setImageError("Usa una imagen JPG, PNG o WebP de hasta 5 MB.");
      event.target.value = "";
      return;
    }
    setSelectedImage(file);
    setRemoveImage(false);
    setImageError("");
  }

  const load = useCallback(async (signal) => {
    const [bulletinData, account] = await Promise.all([
      readJson(await fetchConAuth("/comunidad/foro/bulletins", { signal }), "No se pudieron cargar los avisos."),
      readJson(await fetchConAuth("/comunidad/foro/me", { signal }), "No se pudo verificar tu cuenta."),
    ]);
    return { bulletins: bulletinData.items, isModerator: account.is_moderator };
  }, [fetchConAuth]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).then((data) => {
      if (controller.signal.aborted) return;
      setBulletins(data.bulletins);
      setIsModerator(data.isModerator);
    }).catch((requestError) => {
      if (!controller.signal.aborted) setError(requestError.message);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [load]);

  async function save(event) {
    event.preventDefault();
    if (saving || imageError) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const title = fields.get("title")?.trim();
    const content = fields.get("content")?.trim();
    if (!title || !content) return;
    const values = new FormData();
    values.set("title", title);
    values.set("content", content);
    if (selectedImage) values.set("image", selectedImage);
    if (removeImage) values.set("remove_image", "true");
    setSaving(true);
    setError("");
    try {
      const updating = editingId && editingId !== "new";
      const path = updating
        ? `/comunidad/foro/bulletins/${encodeURIComponent(editingId)}`
        : "/comunidad/foro/bulletins";
      await readJson(await fetchConAuth(path, {
        method: updating ? "PATCH" : "POST",
        body: values,
      }), "No se pudo guardar el aviso.");
      const data = await readJson(await fetchConAuth("/comunidad/foro/bulletins"), "No se pudieron cargar los avisos.");
      setBulletins(data.items);
      startEditing(null);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(bulletin) {
    if (!window.confirm(`¿Eliminar el aviso «${bulletin.title}»?`)) return;
    setError("");
    try {
      const response = await fetchConAuth(`/comunidad/foro/bulletins/${encodeURIComponent(bulletin.id)}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "No se pudo eliminar el aviso.");
      }
      setBulletins((items) => items.filter((item) => item.id !== bulletin.id));
      if (editingId === bulletin.id) startEditing(null);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function editor(bulletin) {
    const creating = !bulletin;
    return (
      <form className="comunidad-bulletin-form" onSubmit={save} key={bulletin?.id || "new"}>
        <label htmlFor={`bulletin-title-${bulletin?.id || "new"}`}>Título del aviso</label>
        <input id={`bulletin-title-${bulletin?.id || "new"}`} name="title"
          defaultValue={bulletin?.title || ""} maxLength={120} required disabled={saving} />
        <label htmlFor={`bulletin-content-${bulletin?.id || "new"}`}>Mensaje para la comunidad</label>
        <textarea id={`bulletin-content-${bulletin?.id || "new"}`} name="content"
          defaultValue={bulletin?.content || ""} maxLength={1000} rows={4} required disabled={saving} />
        <label htmlFor={`bulletin-image-${bulletin?.id || "new"}`} className="comunidad-bulletin-image-label">
          <ImagePlus size={17} aria-hidden="true" /> Imagen del aviso (opcional)
        </label>
        <input id={`bulletin-image-${bulletin?.id || "new"}`} className="comunidad-bulletin-image-input"
          type="file" accept="image/jpeg,image/png,image/webp" onChange={selectImage} disabled={saving} />
        <small className="comunidad-bulletin-image-hint">JPG, PNG o WebP. Máximo 5 MB.</small>
        {imageError && <p className="comunidad-form-error" role="alert">{imageError}</p>}
        {previewUrl && <img className="comunidad-bulletin-preview" src={previewUrl} alt="Vista previa de la imagen del aviso" />}
        {!selectedImage && bulletin?.image_url && !removeImage && (
          <div className="comunidad-bulletin-current-image">
            <ForumImage path={bulletin.image_url} title={bulletin.title} alt={`Imagen actual del aviso: ${bulletin.title}`} />
          </div>
        )}
        {bulletin?.image_url && !selectedImage && (
          <label className="comunidad-bulletin-remove-image">
            <input type="checkbox" checked={removeImage} onChange={(event) => setRemoveImage(event.target.checked)} disabled={saving} />
            Quitar imagen actual
          </label>
        )}
        <div className="comunidad-bulletin-form-actions">
          <button type="button" onClick={() => startEditing(null)} disabled={saving}>Cancelar</button>
          <button type="submit" disabled={saving || !!imageError}>{saving ? "Guardando..." : creating ? "Publicar aviso" : "Guardar cambios"}</button>
        </div>
      </form>
    );
  }

  function toggleManagement() {
    setManageOpen((open) => !open);
    startEditing(null);
  }

  return (
    <section className="comunidad-bulletins" aria-labelledby="comunidad-bulletins-title">
      <div className="comunidad-bulletins-heading">
        <span className="comunidad-bulletins-icon"><Megaphone size={19} aria-hidden="true" /></span>
        <div>
          <p>DESDE MODERACIÓN</p>
          <h2 id="comunidad-bulletins-title">Avisos de la comunidad</h2>
        </div>
      </div>
      {isModerator && (
        <button type="button" className="comunidad-bulletin-manage" onClick={toggleManagement}
          aria-expanded={manageOpen} aria-controls="comunidad-bulletin-management">
          <Settings2 size={17} aria-hidden="true" />
          {manageOpen ? "Cerrar gestión" : "Gestionar avisos"}
        </button>
      )}
      {isModerator && (
        <Collapse in={manageOpen} timeout={motionDuration}>
          <div id="comunidad-bulletin-management" className="comunidad-bulletin-manager" inert={!manageOpen}>
            <h3>Gestión de avisos</h3>
            {editingId === null && (
              <button type="button" className="comunidad-bulletin-new" onClick={() => startEditing("new")}>
                + Nuevo aviso
              </button>
            )}
            {editingId === "new" && editor(null)}
            {bulletins.filter((bulletin) => bulletin.can_manage).map((bulletin) => (
              <div key={bulletin.id} className="comunidad-bulletin-manage-item">
                {editingId === bulletin.id ? editor(bulletin) : (
                  <>
                    <strong>{bulletin.title}</strong>
                    <div className="comunidad-bulletin-actions">
                      <button type="button" onClick={() => startEditing(bulletin.id)} aria-label={`Editar ${bulletin.title}`}>
                        <Pencil size={15} aria-hidden="true" /> Editar
                      </button>
                      <button type="button" onClick={() => remove(bulletin)} aria-label={`Eliminar ${bulletin.title}`}>
                        <Trash2 size={15} aria-hidden="true" /> Eliminar
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </Collapse>
      )}
      {error && <p className="comunidad-form-error" role="alert">{error}</p>}
      {loading && <p className="comunidad-bulletins-empty" role="status">Cargando avisos...</p>}
      {!loading && bulletins.length === 0 && (
        <p className="comunidad-bulletins-empty">Aún no hay avisos de moderación.</p>
      )}
      <div className="comunidad-bulletins-list">
        {bulletins.map((bulletin) => (
          <Fade in key={bulletin.id} timeout={motionDuration}>
            <article className="comunidad-bulletin-card">
              <span className="comunidad-bulletin-card-kicker"><Megaphone size={13} aria-hidden="true" /> Aviso de moderación</span>
              <h3>{bulletin.title}</h3>
              <p>{bulletin.content}</p>
              {bulletin.image_url && <ForumImage path={bulletin.image_url} title={bulletin.title} alt={`Imagen del aviso: ${bulletin.title}`} />}
              <small className="comunidad-bulletin-card-footer">
                {bulletin.author}{bulletin.created_at && <> · <ForumSentAt value={bulletin.created_at} /></>}
              </small>
            </article>
          </Fade>
        ))}
      </div>
    </section>
  );
}
