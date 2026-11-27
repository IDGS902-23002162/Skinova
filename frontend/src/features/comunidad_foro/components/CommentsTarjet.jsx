import { useState } from "react";
import Collapse from "@mui/material/Collapse";
import Fade from "@mui/material/Fade";
import { Bookmark, Heart, MessageCircle, UserCheck, UserPlus } from "lucide-react";
import { useApi } from "../../../shared/hooks/useApi";
import { useMotionDuration } from "../../../shared/hooks/useMotionDuration";
import ForumImage from "./ForumImage";
import ForumCommentThread from "./ForumCommentThread";
import ForumReportControl from "./ForumReportControl";
import ReplyImagePicker from "./ReplyImagePicker";

function CommentsTarjet({ comment, onToggleFavorite, onToggleLike, onToggleFollow, pendingFollow,
  onReplyCreated, onUpdatePost, onDeletePost, onReportContent }) {
  const { fetchConAuth } = useApi();
  const motionDuration = useMotionDuration();
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [repliesLoaded, setRepliesLoaded] = useState(false);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [replies, setReplies] = useState([]);
  const [submittedReplies, setSubmittedReplies] = useState([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [replyError, setReplyError] = useState("");
  const [reviewNotice, setReviewNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [pendingAction, setPendingAction] = useState("");
  const [animatedAction, setAnimatedAction] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  async function loadReplies(nextOffset = 0) {
    setRepliesLoading(true);
    setReplyError("");
    try {
      const response = await fetchConAuth(
        `/comunidad/foro/posts/${encodeURIComponent(comment.id)}/comments?limit=5&offset=${nextOffset}`,
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No fue posible cargar las respuestas.");
      setReplies((current) => {
        const items = nextOffset === 0 ? data.items : [...current, ...data.items];
        return [...new Map(items.map((reply) => [reply.id, reply])).values()];
      });
      setOffset(nextOffset + data.items.length);
      setHasMore(data.pagination.has_more);
      setRepliesLoaded(true);
    } catch (error) {
      setReplyError(error.message);
    } finally {
      setRepliesLoading(false);
    }
  }

  function toggleReplies() {
    setRepliesOpen(!repliesOpen);
    if (!repliesOpen && !repliesLoaded) loadReplies();
  }

  async function submitReply(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const content = replyContent.trim();
    if (!content) {
      setReplyError("Escribe una respuesta antes de enviarla.");
      return;
    }
    if (isSubmittingReply) return;
    setIsSubmittingReply(true);
    setReplyError("");
    setReviewNotice("");
    try {
      const body = new FormData(form);
      body.set("content", content);
      const response = await fetchConAuth(
        `/comunidad/foro/posts/${encodeURIComponent(comment.id)}/comments`,
        { method: "POST", body },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No fue posible publicar la respuesta.");
      form.reset();
      setReplyContent("");
      if (data.status === "pending_review") {
        setReviewNotice(data.message);
        return;
      }
      setSubmittedReplies((items) => [...items, data]);
      onReplyCreated(comment.id);
      // Reload the first page so pagination offsets remain consistent after insertion.
      await loadReplies();
    } catch (error) {
      setReplyError(error.message);
    } finally {
      setIsSubmittingReply(false);
    }
  }

  async function updateAction(action) {
    if (pendingAction) return;
    const activating = action === "favorite" ? !comment.isFavorite : !comment.isLiked;
    setPendingAction(action);
    setActionError("");
    try {
      if (action === "favorite") await onToggleFavorite(comment.id, !comment.isFavorite);
      else await onToggleLike(comment.id, !comment.isLiked);
      setAnimatedAction(activating ? action : "");
    } catch (error) {
      setActionError(error.message);
    } finally {
      setPendingAction("");
    }
  }

  async function savePost(event) {
    event.preventDefault();
    if (savingEdit) return;
    const values = new FormData(event.currentTarget);
    setSavingEdit(true);
    setEditError("");
    try {
      await onUpdatePost(comment.id, {
        title: values.get("title").trim(),
        content: values.get("content").trim(),
        category: values.get("category"),
      });
      setEditing(false);
    } catch (error) {
      setEditError(error.message);
    } finally {
      setSavingEdit(false);
    }
  }

  async function deletePost() {
    if (!window.confirm("¿Eliminar esta publicación y ocultar sus respuestas?")) return;
    setEditError("");
    try {
      await onDeletePost(comment.id);
    } catch (error) {
      setEditError(error.message);
    }
  }

  async function changeFollow() {
    setActionError("");
    try {
      await onToggleFollow(comment.authorId, !comment.isFollowingAuthor);
    } catch (error) {
      setActionError(error.message);
    }
  }

  return (
    <Fade in timeout={motionDuration}>
      <article className="comunidad-post-card" id={`forum-post-${comment.id}`}>
        <header className="comunidad-post-author">
          <div className="comunidad-avatar" aria-hidden="true">{comment.initials}</div>
          <div><p>{comment.author}{comment.isMine && " (tú)"}</p><span>{comment.time}</span></div>
          {!comment.isMine && comment.authorId && (
            <button type="button" className="comunidad-follow-button" onClick={changeFollow}
              disabled={Boolean(pendingFollow)} aria-pressed={comment.isFollowingAuthor}
              aria-label={`${comment.isFollowingAuthor ? "Dejar de seguir a" : "Seguir a"} ${comment.author}`}>
              {comment.isFollowingAuthor ? <UserCheck size={16} aria-hidden="true" /> : <UserPlus size={16} aria-hidden="true" />}
              {pendingFollow === comment.authorId ? "Guardando…" : comment.isFollowingAuthor ? "Siguiendo" : "Seguir"}
            </button>
          )}
          <span className="comunidad-post-topic">{comment.topic}</span>
        </header>
        <h3>{comment.title}</h3>
        <p className="comunidad-post-content">{comment.content}</p>
        {comment.imageUrl && <ForumImage path={comment.imageUrl} title={comment.title} />}
        <Collapse in={editing} timeout={motionDuration} mountOnEnter unmountOnExit>
          <form className="comunidad-post-edit" onSubmit={savePost} inert={!editing}>
            <label htmlFor={`edit-title-${comment.id}`}>Título</label>
            <input id={`edit-title-${comment.id}`} name="title" defaultValue={comment.title} maxLength={200} required />
            <label htmlFor={`edit-category-${comment.id}`}>Tema</label>
            <select id={`edit-category-${comment.id}`} name="category" defaultValue={comment.topic}>
              {["Rutinas", "Piel sensible", "Recomendaciones", "General"].map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <label htmlFor={`edit-content-${comment.id}`}>Comentario</label>
            <textarea id={`edit-content-${comment.id}`} name="content" defaultValue={comment.content}
              maxLength={3000} rows={5} required />
            <div className="comunidad-comment-form-actions">
              <button type="button" onClick={() => setEditing(false)} disabled={savingEdit}>Cancelar</button>
              <button type="submit" disabled={savingEdit}>{savingEdit ? "Guardando..." : "Guardar cambios"}</button>
            </div>
          </form>
        </Collapse>
        {editError && <p className="comunidad-form-error" role="alert">{editError}</p>}
        <footer className="comunidad-post-footer">
          <button type="button"
            className={`comunidad-post-action comunidad-like-action ${comment.isLiked ? "active" : ""} ${animatedAction === "like" ? "action-celebrate" : ""}`}
            onClick={() => updateAction("like")} disabled={Boolean(pendingAction)} aria-pressed={comment.isLiked}
            onAnimationEnd={(event) => {
              if (event.target === event.currentTarget) setAnimatedAction("");
            }}>
            <Heart size={17} aria-hidden="true" fill={comment.isLiked ? "currentColor" : "none"} />
            Me gusta ({comment.likesCount})
          </button>
          <button type="button"
            className={`comunidad-post-action comunidad-favorite-action ${comment.isFavorite ? "active" : ""} ${animatedAction === "favorite" ? "action-celebrate" : ""}`}
            onClick={() => updateAction("favorite")} disabled={Boolean(pendingAction)} aria-pressed={comment.isFavorite}
            onAnimationEnd={(event) => {
              if (event.target === event.currentTarget) setAnimatedAction("");
            }}>
            <Bookmark size={17} aria-hidden="true" fill={comment.isFavorite ? "currentColor" : "none"} />
            {comment.isFavorite ? "Quitar de favoritos" : "Guardar en favoritos"}
          </button>
          <button type="button" className="comunidad-post-action" onClick={toggleReplies}
            aria-expanded={repliesOpen} aria-controls={`replies-${comment.id}`}>
            <MessageCircle size={17} aria-hidden="true" />
            {repliesOpen ? "Ocultar respuestas" : `Respuestas (${comment.commentsCount})`}
          </button>
          {comment.isMine && (
            <>
              <button type="button" className="comunidad-post-action" onClick={() => setEditing((value) => !value)}>Editar</button>
              <button type="button" className="comunidad-post-action" onClick={deletePost}>Eliminar</button>
            </>
          )}
          {!comment.isMine && (
            <ForumReportControl targetType="post" targetId={comment.id} hasImage={Boolean(comment.imageUrl)} onReport={onReportContent} />
          )}
        </footer>
        {actionError && <p className="comunidad-form-error" role="alert">{actionError}</p>}
        <Collapse in={repliesOpen} timeout={motionDuration} mountOnEnter unmountOnExit>
          <section id={`replies-${comment.id}`} className="comunidad-replies" aria-label="Respuestas" inert={!repliesOpen}>
            {replies.map((reply) => (
              <ForumCommentThread key={reply.id} comment={reply} postId={comment.id}
                onReplyCreated={onReplyCreated} onReportContent={onReportContent} />
            ))}
            {submittedReplies.filter((reply) => !replies.some((item) => item.id === reply.id)).map((reply) => (
              <ForumCommentThread key={reply.id} comment={reply} postId={comment.id}
                onReplyCreated={onReplyCreated} onReportContent={onReportContent} />
            ))}
            {repliesLoading && <p role="status">Cargando respuestas...</p>}
            {repliesLoaded && replies.length === 0 && submittedReplies.length === 0 && !repliesLoading && <p className="comunidad-reply-empty">Aún no hay respuestas.</p>}
            {replyError && <p className="comunidad-form-error" role="alert">{replyError}</p>}
            {reviewNotice && <p role="status">{reviewNotice}</p>}
            {(hasMore || replyError) && <button type="button" className="comunidad-post-action"
              disabled={repliesLoading || isSubmittingReply} onClick={() => loadReplies(repliesLoaded ? offset : 0)}>
              {replyError ? "Reintentar cargar respuestas" : "Cargar más respuestas"}
            </button>}
            <form onSubmit={submitReply}>
              <label htmlFor={`reply-${comment.id}`}>Responder a la publicación</label>
              <textarea id={`reply-${comment.id}`} value={replyContent} onChange={(event) => setReplyContent(event.target.value)}
                maxLength={3000} required disabled={isSubmittingReply} />
              <ReplyImagePicker disabled={isSubmittingReply} />
              <button type="submit" disabled={isSubmittingReply || repliesLoading || !repliesLoaded}>
                {isSubmittingReply ? "Enviando..." : "Enviar respuesta"}
              </button>
            </form>
          </section>
        </Collapse>
      </article>
    </Fade>
  );
}
export default CommentsTarjet;
