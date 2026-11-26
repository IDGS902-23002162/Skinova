import { useState } from "react";
import { Flag } from "lucide-react";
import { reportReasons } from "../reportReasons";

export default function ForumReportControl({ targetType, targetId, hasImage, onReport }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("unsafe_advice");
  const [details, setDetails] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [medium, setMedium] = useState("text");
  const [reported, setReported] = useState([]);
  const available = ["text", ...(hasImage ? ["image"] : [])].filter((value) => !reported.includes(value));
  const selectedMedium = available.includes(medium) ? medium : available[0];
  const formId = `report-${targetId}`;

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await onReport(targetType, targetId, reason, details.trim(), selectedMedium);
      setReported((values) => [...values, selectedMedium]);
      setDetails("");
      setOpen(false);
      setMessage("Reporte enviado para revisión.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="comunidad-report">
      {available.length > 0 && (
        <button type="button" className="comunidad-comment-action" onClick={() => setOpen((value) => !value)}
          aria-expanded={open} aria-controls={formId}>
          <Flag size={15} aria-hidden="true" /> Reportar
        </button>
      )}
      {open && (
        <form id={formId} className="comunidad-report-form" onSubmit={submit}>
          <label htmlFor={`medium-${targetId}`}>¿Dónde aparece el contenido?</label>
          <select id={`medium-${targetId}`} value={selectedMedium} disabled={saving}
            onChange={(event) => setMedium(event.target.value)}>
            {available.includes("text") && <option value="text">En el texto</option>}
            {available.includes("image") && <option value="image">En la imagen adjunta</option>}
          </select>
          <label htmlFor={`reason-${targetId}`}>Motivo del reporte</label>
          <select id={`reason-${targetId}`} value={reason} onChange={(event) => setReason(event.target.value)}>
            {reportReasons.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <label htmlFor={`details-${targetId}`}>Detalles (opcional)</label>
          <textarea id={`details-${targetId}`} value={details} onChange={(event) => setDetails(event.target.value)}
            maxLength={1000} rows={2} />
          <div className="comunidad-report-actions">
            <button type="button" onClick={() => setOpen(false)} disabled={saving}>Cancelar</button>
            <button type="submit" disabled={saving}>{saving ? "Enviando..." : "Enviar reporte"}</button>
          </div>
        </form>
      )}
      {message && <p className="comunidad-report-message" role="status">{message}</p>}
    </div>
  );
}
