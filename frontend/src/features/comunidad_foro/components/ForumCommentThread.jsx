import { useState } from "react";
import { CornerDownRight, MessageCircle } from "lucide-react";
import { useApi } from "../../../shared/hooks/useApi";
import ForumReportControl from "./ForumReportControl";
import ForumImage from "./ForumImage";
import ReplyImagePicker from "./ReplyImagePicker";

export default function ForumCommentThread({ comment, postId, onReplyCreated, onReportContent }) {
  const { fetchConAuth } = useApi();
  const [currentComment, setCurrentComment] = useState(comment);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [savingEdit, setSavingEdit] = useState(false);
  const [childrenOpen, setChildrenOpen] = useState(false);
  const [childrenLoaded, setChildrenLoaded] = useState(false);
  const [childrenLoading, setChildrenLoading] = useState(false);
  const [children, setChildren] = useState([]);
  const [submittedChildren, setSubmittedChildren] = useState([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [reviewNotice, setReviewNotice] = useState("");

  const extraChildren = submittedChildren.filter(
    (submitted) => !children.some((child) => child.id === submitted.id),
  );
  const childCount = Math.max(comment.replies_count || 0, children.length) + extraChildren.length;

  async function loadChildren(nextOffset = 0) {
    if (childrenLoading) return;
    setChildrenLoading(true);
    setError("");
    try {
      const response = await fetchConAuth(
        `/comunidad/foro/posts/${encodeURIComponent(postId)}/comments?parent_id=${encodeURIComponent(comment.id)}&limit=5&offset=${nextOffset}`,
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No fue posible cargar las respuestas.");
      setChildren((current) => {
        const items = nextOffset === 0 ? data.items : [...current, ...data.items];
        return [...new Map(items.map((item) => [item.id, item])).values()];
      });
      setOffset(nextOffset + data.items.length);
      setHasMore(data.pagination.has_more);
      setChildrenLoaded(true);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setChildrenLoading(false);
    }
  }

  function toggleChildren() {
    setChildrenOpen((open) => !open);
    if (!childrenOpen && !childrenLoaded && comment.replies_count) loadChildren();
  }

  async function submitReply(event) {
    event.preventDefault();
    const message = content.trim();
    if (!message || saving) return;
    setSaving(true);
    setError("");
    setReviewNotice("");
    try {
      const body = new FormData(event.currentTarget);
      body.set("content", message);
      body.set("parent_comment_id", comment.id);
      const response = await fetchConAuth(
        `/comunidad/foro/posts/${encodeURIComponent(postId)}/comments`,
        { method: "POST", body },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No fue posible publicar la respuesta.");
      setContent("");
      setReplyOpen(false);
      if (data.status === "pending_review") {
        setReviewNotice(data.message);
        return;
      }
      setSubmittedChildren((items) => [...items, data]);
      setChildrenOpen(true);
      onReplyCreated(postId);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit(event) {
    event.preventDefault();
    if (!editContent.trim() || savingEdit) return;
    setSavingEdit(true);
    setError("");
    try {
      const response = await fetchConAuth(
        `/comunidad/foro/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(comment.id)}`,
        { method: "PATCH", body: JSON.stringify({ content: editContent.trim() }) },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No fue posible editar el comentario.");
      setCurrentComment(data);
      setEditing(false);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingEdit(false);
    }
  }

  async function deleteComment() {
    if (!window.confirm("¿Eliminar este comentario?")) return;
    setError("");
    try {
      const response = await fetchConAuth(
        `/comunidad/foro/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(comment.id)}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "No fue posible eliminar el comentario.");
      }
      setCurrentComment((value) => ({ ...value, content: "Comentario eliminado.", status: "deleted" }));
      setEditing(false);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <article className="comunidad-comment">
      <div className="comunidad-comment-body">
        <strong>{currentComment.author || "Miembro de la comunidad"}</strong>
        <p>{currentComment.content}</p>
        {currentComment.status === "active" && currentComment.image_url && (
          <ForumImage path={currentComment.image_url} alt="Imagen adjunta a la respuesta" />
        )}
        <div className="comunidad-comment-actions">
          {currentComment.status === "active" && (
            <button type="button" className="comunidad-comment-action" onClick={() => setReplyOpen((open) => !open)}
              aria-expanded={replyOpen} aria-controls={`comment-form-${comment.id}`}>
              <CornerDownRight size={15} aria-hidden="true" /> Responder
            </button>
          )}
          {childCount > 0 && (
            <button type="button" className="comunidad-comment-action" onClick={toggleChildren}
              aria-expanded={childrenOpen} aria-controls={`comment-children-${comment.id}`}>
              <MessageCircle size={15} aria-hidden="true" />
              {childrenOpen ? "Ocultar respuestas" : `Ver respuestas (${childCount})`}
            </button>
          )}
          {currentComment.is_mine && currentComment.status === "active" && (
            <>
              <button type="button" className="comunidad-comment-action" onClick={() => setEditing((value) => !value)}>Editar</button>
              <button type="button" className="comunidad-comment-action" onClick={deleteComment}>Eliminar</button>
            </>
          )}
          {!currentComment.is_mine && currentComment.status === "active" && (
            <ForumReportControl targetType="comment" targetId={comment.id} hasImage={Boolean(currentComment.image_url)}
              onReport={onReportContent} />
          )}
        </div>
      </div>

      {editing && (
        <form className="comunidad-comment-form" onSubmit={saveEdit}>
          <label htmlFor={`edit-comment-${comment.id}`}>Editar comentario</label>
          <textarea id={`edit-comment-${comment.id}`} value={editContent}
            onChange={(event) => setEditContent(event.target.value)} maxLength={3000} required disabled={savingEdit} />
          <div className="comunidad-comment-form-actions">
            <button type="button" onClick={() => setEditing(false)} disabled={savingEdit}>Cancelar</button>
            <button type="submit" disabled={savingEdit || !editContent.trim()}>Guardar</button>
          </div>
        </form>
      )}

      {replyOpen && (
        <form id={`comment-form-${comment.id}`} className="comunidad-comment-form" onSubmit={submitReply}>
          <label htmlFor={`comment-reply-${comment.id}`}>Responder a {comment.author || "este comentario"}</label>
          <textarea id={`comment-reply-${comment.id}`} value={content}
            onChange={(event) => setContent(event.target.value)} maxLength={3000} required disabled={saving} />
          <ReplyImagePicker disabled={saving} />
          <div className="comunidad-comment-form-actions">
            <button type="button" onClick={() => setReplyOpen(false)} disabled={saving}>Cancelar</button>
            <button type="submit" disabled={saving || !content.trim()}>
              {saving ? "Publicando..." : "Publicar respuesta"}
            </button>
          </div>
        </form>
      )}
      {error && <p className="comunidad-form-error" role="alert">{error}</p>}
      {reviewNotice && <p role="status">{reviewNotice}</p>}
      {childrenOpen && (
        <div id={`comment-children-${comment.id}`} className="comunidad-thread-children">
          {[...children, ...extraChildren].map((child) => (
            <ForumCommentThread key={child.id} comment={child} postId={postId}
              onReplyCreated={onReplyCreated} onReportContent={onReportContent} />
          ))}
          {childrenLoading && <p role="status">Cargando respuestas...</p>}
          {hasMore && (
            <button type="button" className="comunidad-comment-action" onClick={() => loadChildren(offset)}
              disabled={childrenLoading}>Cargar más respuestas</button>
          )}
          {error && !childrenLoaded && (
            <button type="button" className="comunidad-comment-action" onClick={() => loadChildren()}
              disabled={childrenLoading}>Reintentar cargar respuestas</button>
          )}
        </div>
      )}
    </article>
  );
}
