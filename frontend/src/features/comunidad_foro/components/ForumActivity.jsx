import { useCallback, useEffect, useRef, useState } from "react";
import { useApi } from "../../../shared/hooks/useApi";
import ForumImage from "./ForumImage";
import ForumSentAt from "./ForumSentAt";
import { reportReasons } from "../reportReasons";

const reviewReasons = [...reportReasons, ["image_review_unavailable", "Análisis de imagen no disponible"]];
const reasonLabels = Object.fromEntries(reviewReasons);
const mediumLabels = { content: "Contenido general", text: "Texto", image: "Imagen" };
const detectionFields = { title: "Título", text: "Texto", image: "Imagen", category: "Categoría", tags: "Etiquetas" };

async function readJson(response) {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "No fue posible cargar la actividad.");
  return data;
}

export default function ForumActivity({ mode, onOpenPost, onModerated }) {
  const { fetchConAuth } = useApi();
  const showReports = mode === "reports";
  const [notifications, setNotifications] = useState([]);
  const [reports, setReports] = useState([]);
  const [reason, setReason] = useState("");
  const [medium, setMedium] = useState("");
  const [targetType, setTargetType] = useState("");
  const [visibleImage, setVisibleImage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const reportRequest = useRef(0);

  const loadNotifications = useCallback(async () => {
    const data = await readJson(await fetchConAuth("/comunidad/foro/notifications"));
    setNotifications(data.items);
  }, [fetchConAuth]);

  const loadReports = useCallback(async () => {
    const requestId = ++reportRequest.current;
    const query = new URLSearchParams({ reason, medium, target_type: targetType });
    const data = await readJson(await fetchConAuth(`/comunidad/foro/reports?${query}`));
    if (requestId !== reportRequest.current) return;
    setReports(data.items);
  }, [fetchConAuth, reason, medium, targetType]);

  function changeFilter(setFilter, value) {
    reportRequest.current++;
    setFilter(value);
    setLoading(true);
    setReports([]);
    setVisibleImage("");
    setError("");
  }

  useEffect(() => {
    let active = true;
    const load = showReports ? loadReports : loadNotifications;
    load().catch((requestError) => {
      if (active) setError(requestError.message);
    }).finally(() => {
      if (active) setLoading(false);
    });
    function refresh() {
      if (document.visibilityState === "visible") load().catch(() => {});
    }
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [loadNotifications, loadReports, showReports]);

  async function openNotification(item) {
    setBusy(item.id);
    setError("");
    try {
      if (!item.is_read) {
        await readJson(await fetchConAuth(`/comunidad/foro/notifications/${encodeURIComponent(item.id)}/read`,
          { method: "PUT" }));
        setNotifications((current) => current.map((value) => value.id === item.id ? { ...value, is_read: true } : value));
      }
      const postId = item.action_path
        ? new URL(item.action_path, window.location.origin).searchParams.get("post")
        : null;
      if (postId) await onOpenPost(postId);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy("");
    }
  }

  async function review(report, decision) {
    setBusy(report.id);
    setError("");
    try {
      await readJson(await fetchConAuth(`/comunidad/foro/reports/${encodeURIComponent(report.id)}`, {
        method: "PATCH", body: JSON.stringify({ decision }),
      }));
      if (decision === "hide" || decision === "approve") onModerated(report.target_id, report.target_type);
      await loadReports();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy("");
    }
  }

  async function markReportRead(report) {
    setBusy(report.id);
    setError("");
    try {
      await readJson(await fetchConAuth(`/comunidad/foro/reports/${encodeURIComponent(report.id)}/read`, { method: "PUT" }));
      await loadReports();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="comunidad-activity">
      {error && <p className="comunidad-form-error" role="alert">{error}</p>}
      {loading && <p role="status">Cargando…</p>}
      {!showReports && (
        <section className="comunidad-activity-panel" aria-label="Avisos de la comunidad">
          <h3>Avisos recientes</h3>
          {!loading && !error && notifications.length === 0 && <p>Aún no tienes avisos.</p>}
          {notifications.map((item) => (
            <button key={item.id} type="button" className={item.is_read ? "" : "unread"}
              onClick={() => openNotification(item)} disabled={busy === item.id}>
              <strong>{item.title}</strong><span>{item.message}</span>
              <ForumSentAt value={item.created_at} />
            </button>
          ))}
        </section>
      )}
      {showReports && (
        <section className="comunidad-activity-panel comunidad-moderation-reports" aria-label="Reportes pendientes">
          <h3>Reportes y revisiones pendientes</h3>
          <div className="comunidad-moderation-filters">
            <label>
              Motivo del reporte{" "}
              <select value={reason} disabled={Boolean(busy)} onChange={(event) => changeFilter(setReason, event.target.value)}>
                <option value="">Todos</option>
                {reviewReasons.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label>
              Contenido denunciado{" "}
              <select value={medium} disabled={Boolean(busy)} onChange={(event) => changeFilter(setMedium, event.target.value)}>
                <option value="">Todos</option>
                {Object.entries(mediumLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label>
              Ubicación{" "}
              <select value={targetType} disabled={Boolean(busy)} onChange={(event) => changeFilter(setTargetType, event.target.value)}>
                <option value="">Todas</option>
                <option value="post">Publicaciones</option>
                <option value="comment">Comentarios y respuestas</option>
              </select>
            </label>
          </div>
          {!loading && !error && reports.length === 0 && <p>No hay reportes pendientes.</p>}
          {reports.map((report) => (
            <article key={report.id} className="comunidad-review-card">
              <strong>{report.target_type === "post" ? "Publicación" : "Comentario"} · {mediumLabels[report.medium]} · {reasonLabels[report.reason] || "Otro motivo"}</strong>
              {report.detections && (
                <div>
                  <strong>Motivos de revisión</strong>
                  <ul>
                    {report.detections.map(({ field, reason: detectedReason }) => (
                      <li key={field}>{detectionFields[field]} · {reasonLabels[detectedReason]}</li>
                    ))}
                  </ul>
                </div>
              )}
              {report.title && <h4>{report.title}</h4>}
              <p>{report.preview}</p>
              {report.image_url && (
                <p>
                  <button type="button" aria-expanded={visibleImage === report.id}
                    onClick={() => setVisibleImage(visibleImage === report.id ? "" : report.id)}>
                    {visibleImage === report.id ? "Ocultar vista previa" : "Ver imagen adjunta"}
                  </button>
                </p>
              )}
              {report.image_url && visibleImage === report.id && (
                <ForumImage path={report.image_url} title={report.title} alt="Imagen adjunta al contenido reportado" />
              )}
              {report.details && <p>Motivo: {report.details}</p>}
              <div>
                {!report.is_read && <button type="button" onClick={() => markReportRead(report)} disabled={Boolean(busy)}>Marcar como leído</button>}
                {report.detections ? (
                  <>
                    <button type="button" onClick={() => review(report, "reject")} disabled={Boolean(busy)}>Rechazar</button>
                    <button type="button" onClick={() => review(report, "approve")} disabled={Boolean(busy)}>Aprobar y publicar</button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => review(report, "dismiss")} disabled={Boolean(busy)}>Descartar reporte</button>
                    <button type="button" onClick={() => review(report, "hide")} disabled={Boolean(busy)}>Ocultar contenido</button>
                  </>
                )}
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
