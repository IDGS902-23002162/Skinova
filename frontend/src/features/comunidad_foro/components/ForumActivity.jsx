import { useCallback, useEffect, useRef, useState } from "react";
import Collapse from "@mui/material/Collapse";
import { Bell, ShieldCheck } from "lucide-react";
import { useApi } from "../../../shared/hooks/useApi";
import { useMotionDuration } from "../../../shared/hooks/useMotionDuration";
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

export default function ForumActivity({ onOpenPost, onModerated }) {
  const { fetchConAuth } = useApi();
  const motionDuration = useMotionDuration();
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [reports, setReports] = useState([]);
  const [unreadReports, setUnreadReports] = useState(0);
  const [reason, setReason] = useState("");
  const [medium, setMedium] = useState("");
  const [targetType, setTargetType] = useState("");
  const [visibleImage, setVisibleImage] = useState("");
  const [isModerator, setIsModerator] = useState(false);
  const [panel, setPanel] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const reportRequest = useRef(0);

  const loadNotifications = useCallback(async () => {
    const data = await readJson(await fetchConAuth("/comunidad/foro/notifications"));
    setNotifications(data.items);
    setUnread(data.unread);
  }, [fetchConAuth]);

  const loadReports = useCallback(async (summary = false) => {
    const requestId = ++reportRequest.current;
    const query = new URLSearchParams(summary ? { summary: "1" } : { reason, medium, target_type: targetType });
    const data = await readJson(await fetchConAuth(`/comunidad/foro/reports?${query}`));
    if (requestId !== reportRequest.current) return;
    if (!summary) setReports(data.items);
    setUnreadReports(data.unread);
  }, [fetchConAuth, reason, medium, targetType]);

  function changeFilter(setFilter, value) {
    reportRequest.current++;
    setFilter(value);
    setReports([]);
    setVisibleImage("");
    setError("");
  }

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [me, activity] = await Promise.all([
          readJson(await fetchConAuth("/comunidad/foro/me")),
          readJson(await fetchConAuth("/comunidad/foro/notifications")),
        ]);
        if (!active) return;
        setIsModerator(me.is_moderator);
        setNotifications(activity.items);
        setUnread(activity.unread);
      } catch (requestError) {
        if (active) setError(requestError.message);
      }
    }
    load();
    return () => { active = false; };
  }, [fetchConAuth]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      loadNotifications().catch(() => {});
      if (isModerator) loadReports(panel !== "reports").catch(() => {});
    };
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [isModerator, loadNotifications, loadReports, panel]);

  useEffect(() => {
    if (!isModerator) return;
    let active = true;
    async function refreshReports() {
      try {
        await loadReports(panel !== "reports");
      } catch (requestError) {
        if (active) setError(requestError.message);
      }
    }
    refreshReports();
    return () => { active = false; };
  }, [isModerator, loadReports, panel]);

  async function togglePanel(nextPanel) {
    setVisibleImage("");
    if (panel === nextPanel) { setPanel(""); return; }
    setPanel(nextPanel);
    setError("");
    try {
      if (nextPanel === "notifications") await loadNotifications();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function openNotification(item) {
    setBusy(item.id);
    setError("");
    try {
      if (!item.is_read) {
        await readJson(await fetchConAuth(`/comunidad/foro/notifications/${encodeURIComponent(item.id)}/read`,
          { method: "PUT" }));
        setNotifications((current) => current.map((value) => value.id === item.id ? { ...value, is_read: true } : value));
        setUnread((count) => Math.max(0, count - 1));
      }
      const postId = item.action_path
        ? new URL(item.action_path, window.location.origin).searchParams.get("post")
        : null;
      if (postId) await onOpenPost(postId);
      setPanel("");
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
      <div className="comunidad-activity-actions">
        <button type="button" onClick={() => togglePanel("notifications")}
          aria-expanded={panel === "notifications"} aria-controls="foro-notifications"
          aria-label={unread > 0 ? `Avisos: ${unread} sin leer` : "Avisos: ninguno sin leer"}>
          <span className="comunidad-activity-bell">
            <Bell size={19} aria-hidden="true" />
            {unread > 0 && <span className="comunidad-activity-count" aria-hidden="true">{unread > 99 ? "99+" : unread}</span>}
          </span>
          Avisos
        </button>
        {isModerator && (
          <button type="button" onClick={() => togglePanel("reports")}
            aria-expanded={panel === "reports"} aria-controls="foro-reports"
            aria-label={`Moderación · ${unreadReports} reportes sin leer`}>
            <span className="comunidad-activity-bell">
              <ShieldCheck size={18} aria-hidden="true" />
              {unreadReports > 0 && <span className="comunidad-activity-count" aria-hidden="true">{unreadReports > 99 ? "99+" : unreadReports}</span>}
            </span>
            Moderación
          </button>
        )}
      </div>
      {error && <p className="comunidad-form-error" role="alert">{error}</p>}
      <Collapse in={panel === "notifications"} timeout={motionDuration} mountOnEnter unmountOnExit>
        <section id="foro-notifications" className="comunidad-activity-panel" aria-label="Avisos de la comunidad"
          inert={panel !== "notifications"}>
          <h3>Avisos recientes</h3>
          {notifications.length === 0 && <p>Aún no tienes avisos.</p>}
          {notifications.map((item) => (
            <button key={item.id} type="button" className={item.is_read ? "" : "unread"}
              onClick={() => openNotification(item)} disabled={busy === item.id}>
              <strong>{item.title}</strong><span>{item.message}</span>
              <ForumSentAt value={item.created_at} />
            </button>
          ))}
        </section>
      </Collapse>
      {isModerator && <Collapse in={panel === "reports"} timeout={motionDuration} mountOnEnter unmountOnExit>
        <section id="foro-reports" className="comunidad-activity-panel" aria-label="Reportes pendientes"
          inert={panel !== "reports"}>
          <h3>Reportes y revisiones pendientes</h3>
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
          {reports.length === 0 && <p>No hay reportes pendientes.</p>}
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
      </Collapse>}
    </div>
  );
}
