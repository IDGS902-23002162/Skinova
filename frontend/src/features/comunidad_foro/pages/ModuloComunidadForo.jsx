import { useEffect, useRef, useState } from "react";
import Grow from "@mui/material/Grow";
import { Heart, ImagePlus, MessageCircle, SearchX, UsersRound, X } from "lucide-react";
import "./ComunidadForo.css";
import useTarjetComment from "../hooks/useTarjetComment";
import FilterBar from "../../../shared/components/Filtro_Buscador";
import { useMotionDuration } from "../../../shared/hooks/useMotionDuration";
import CommentsList from "../components/CommentsList";
import FloatButton from "../components/FloatButton";
import ForumActivity from "../components/ForumActivity";
import ModeratorBulletins from "../components/ModeratorBulletins";

const categories = [
  "Rutinas",
  "Piel sensible",
  "Recomendaciones",
  "General",
];

export default function ModuloComunidadForo() {
  const motionDuration = useMotionDuration();
  const dialogRef = useRef(null);
  const imageInputRef = useRef(null);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [imageError, setImageError] = useState("");
  const [notice, setNotice] = useState("");
  const [tipoActivo, setTipoActivo] = useState("Todos");
  const [buscarPor, setBuscarPor] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedPost, setSelectedPost] = useState(null);
  const [feedVersion, setFeedVersion] = useState(0);
  const [postView, setPostView] = useState("following");
  const [pendingFollow, setPendingFollow] = useState("");
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const { comments, total, hasMore, loading, loadingMore, loadMoreError, error, loadMore, refresh,
    createPost, updatePost, deletePost, reportContent, getPost, toggleFavorite, toggleLike, toggleFollow, onReplyCreated } =
    useTarjetComment(postView, tipoActivo, debouncedSearch);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(buscarPor), 300);
    return () => window.clearTimeout(timer);
  }, [buscarPor]);

  useEffect(() => {
    if (selectedPost && !loading && postView === "all") {
      document.getElementById(`forum-post-${selectedPost.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [selectedPost?.id, loading, postView]);

  useEffect(() => {
    if (isComposerOpen) dialogRef.current?.showModal();
  }, [isComposerOpen]);

  useEffect(() => {
    if (!image) { setPreview(""); return; }
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  function selectImage(event) {
    const file = event.target.files?.[0];
    setImageError("");
    setImage(null);
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setImageError("Elige una imagen JPG, PNG o WebP de hasta 5 MB.");
      event.target.value = "";
      return;
    }
    setImage(file);
  }

  const visiblePosts = selectedPost && postView === "all"
    ? [comments.find((post) => post.id === selectedPost.id) || selectedPost,
      ...comments.filter((post) => post.id !== selectedPost.id)]
    : comments;

  async function openPost(postId) {
    const post = await getPost(postId);
    setPostView("all");
    setTipoActivo("Todos");
    setBuscarPor("");
    setDebouncedSearch("");
    setSelectedPost(post);
  }

  async function handleDeletePost(postId) {
    await deletePost(postId);
    if (selectedPost?.id === postId) setSelectedPost(null);
  }

  async function handleUpdatePost(postId, values) {
    await updatePost(postId, values);
    if (selectedPost?.id === postId) setSelectedPost(null);
  }

  async function handleToggleLike(postId, shouldBeLiked) {
    const result = await toggleLike(postId, shouldBeLiked);
    setSelectedPost((post) => post?.id === postId
      ? { ...post, isLiked: result.is_liked, likesCount: result.likes_count } : post);
  }

  async function handleToggleFavorite(postId, shouldBeFavorite) {
    const result = await toggleFavorite(postId, shouldBeFavorite);
    setSelectedPost((post) => post?.id === postId
      ? { ...post, isFavorite: result.is_favorite } : post);
  }

  async function handleToggleFollow(authorId, shouldFollow) {
    if (pendingFollow) return;
    setPendingFollow(authorId);
    try {
      const result = await toggleFollow(authorId, shouldFollow);
      setSelectedPost((post) => post?.authorId === authorId
        ? { ...post, isFollowingAuthor: result.is_following } : post);
    } finally {
      setPendingFollow("");
    }
  }

  function handleReplyCreated(postId) {
    onReplyCreated(postId);
    setSelectedPost((post) => post?.id === postId
      ? { ...post, commentsCount: post.commentsCount + 1 } : post);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSaving || imageError) return;
    setIsSaving(true);
    setSubmitError("");

    const form = event.currentTarget;
    const values = new FormData(form);
    const title = values.get("title").trim();
    const content = values.get("content").trim();
    const category = values.get("category");

    try {
      if (!title || !content) throw new Error("Escribe un título y un comentario antes de publicar.");
      const result = await createPost({ title, content, category, image });
      setPostView("all");
      setTipoActivo("Todos");
      setBuscarPor("");
      setDebouncedSearch("");
      setSelectedPost(null);
      setImage(null);
      setNotice(result.message || "Tu publicación se compartió con la comunidad.");
      form.reset();
      setIsComposerOpen(false);
    } catch (requestError) {
      setSubmitError(requestError.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <div className="comunidad-page">
        <header className="comunidad-header">
          <div>
            <h1>Comunidad Skinova</h1>
            <p className="comunidad-intro">
              Cuéntanos qué te funciona, pregunta lo que te da curiosidad y toma ideas para tu rutina.
            </p>
          </div>
          <div className="comunidad-members">
            <UsersRound size={19} aria-hidden="true" />
            <span>Nos cuidamos en comunidad</span>
          </div>
        </header>

        <div className="comunidad-layout">
          <main className="comunidad-feed">
            <section className="comunidad-feed-heading">
              <div>
                <h2>¿Qué se está compartiendo?</h2>
              </div>
            </section>

            <nav className="comunidad-post-views" aria-label="Ver publicaciones">
              {[
                { value: "following", label: "Inicio", description: "Publicaciones de las personas que sigues" },
                { value: "all", label: "Toda la comunidad" },
                { value: "mine", label: "Compartidos por mí" },
                { value: "favorites", label: "Favoritos" },
              ].map((view) => (
                <button
                  type="button"
                  key={view.value}
                  className={postView === view.value ? "active" : ""}
                  onClick={() => setPostView(view.value)}
                  aria-pressed={postView === view.value}
                  title={view.description}
                >
                  {view.label}
                </button>
              ))}
            </nav>

            <FilterBar
              tipos={["Todos", ...categories]}
              tipoActivo={tipoActivo}
              buscarPor={buscarPor}
              onSeleccionar={setTipoActivo}
              onBuscar={setBuscarPor}
            />

            <p className="comunidad-notice" role="status">{notice}</p>
            {loading && (
              <div className="comunidad-feed-state" role="status">
                <MessageCircle size={24} aria-hidden="true" />
                <p>Cargando conversaciones...</p>
              </div>
            )}
            {error && (
              <div className="comunidad-feed-state comunidad-feed-state-error" role="alert">
                <p>No pudimos cargar las conversaciones.</p>
                <span>{error}</span>
              </div>
            )}
            {!loading && !error && (
              <>
                <h2 className="comunidad-results-heading">
                  Publicaciones <span>{total}</span>
                </h2>
                <CommentsList
                  key={feedVersion}
                  comments={visiblePosts}
                  onToggleFavorite={handleToggleFavorite}
                  onToggleLike={handleToggleLike}
                  onToggleFollow={handleToggleFollow}
                  pendingFollow={pendingFollow}
                  onReplyCreated={handleReplyCreated}
                  onUpdatePost={handleUpdatePost}
                  onDeletePost={handleDeletePost}
                  onReportContent={reportContent}
                />
                {hasMore && (
                  <button type="button" className="comunidad-load-more" onClick={loadMore} disabled={loadingMore}>
                    {loadingMore ? "Cargando..." : "Cargar más publicaciones"}
                  </button>
                )}
                {loadMoreError && <p className="comunidad-form-error" role="alert">{loadMoreError}</p>}
                {visiblePosts.length === 0 && (
                  <div className="comunidad-feed-state comunidad-empty">
                    <SearchX size={28} aria-hidden="true" />
                    <h3>No encontramos publicaciones</h3>
                    {postView === "following" && tipoActivo === "Todos" && !debouncedSearch.trim() ? (
                      <>
                        <p>Las publicaciones de las personas que sigas aparecen aquí.</p>
                        <button type="button" className="comunidad-load-more" onClick={() => setPostView("all")}>
                          Explorar toda la comunidad
                        </button>
                      </>
                    ) : <p>Prueba con otro tema o búsqueda, o comparte tu experiencia con la comunidad.</p>}
                  </div>
                )}
              </>
            )}
          </main>

          <aside className="comunidad-sidebar" aria-label="Información de la comunidad">
            <ForumActivity onOpenPost={openPost} onModerated={() => {
              setSelectedPost(null);
              setFeedVersion((value) => value + 1);
              refresh();
            }} />
            <ModeratorBulletins />
            <section className="comunidad-guidelines">
              <span className="comunidad-guidelines-icon">
                <Heart size={20} aria-hidden="true" />
              </span>
              <h2>Un espacio amable</h2>
              <p>
                Cada piel y cada experiencia son distintas. Compartimos para
                acompañarnos, no para juzgar ni sustituir una consulta
                profesional.
              </p>
              <ul>
                <li>Habla desde tu experiencia.</li>
                <li>Respeta los procesos de cada persona.</li>
                <li>Evita recomendar diagnósticos o tratamientos.</li>
              </ul>
            </section>
          </aside>
        </div>
      </div>

      <FloatButton
        onClick={() => {
          setSubmitError("");
          setImageError("");
          setImage(null);
          setNotice("");
          setIsComposerOpen(true);
        }}
      />

      {isComposerOpen && (
        <Grow in timeout={motionDuration}>
          <dialog
            ref={dialogRef}
            className="comunidad-composer"
            onCancel={(event) => { if (isSaving) event.preventDefault(); }}
            onClose={() => setIsComposerOpen(false)}
            aria-labelledby="comunidad-composer-title"
          >
            <button
              className="comunidad-composer-close"
              type="button"
              onClick={() => setIsComposerOpen(false)}
              aria-label="Cerrar formulario"
              disabled={isSaving}
            >
              ×
            </button>
            <h2 id="comunidad-composer-title">Comparte con la comunidad</h2>
            <p>Cuéntanos tu experiencia de forma respetuosa y amable.</p>
            <form onSubmit={handleSubmit}>
              <fieldset disabled={isSaving} className="comunidad-composer-fields">
              <label htmlFor="comunidad-post-title">Título</label>
              <input
                id="comunidad-post-title"
                name="title"
                maxLength={200}
                required
              />
              <label htmlFor="comunidad-post-category">Tema</label>
              <select
                id="comunidad-post-category"
                name="category"
                defaultValue="Rutinas"
                required
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <label htmlFor="comunidad-post-content">Comentario</label>
              <textarea
                id="comunidad-post-content"
                name="content"
                rows={5}
                maxLength={3000}
                required
              />
              <label htmlFor="comunidad-post-image">Imagen (opcional)</label>
              <div className={`comunidad-image-picker${imageError ? " comunidad-image-picker-error" : ""}`}>
                <input
                  ref={imageInputRef}
                  id="comunidad-post-image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={selectImage}
                  aria-describedby="comunidad-image-help"
                  aria-invalid={Boolean(imageError)}
                />
                <span className="comunidad-image-picker-icon" aria-hidden="true">
                  <ImagePlus size={23} />
                </span>
                <span className="comunidad-image-picker-copy" aria-hidden="true">
                  <strong>{image ? "Cambiar imagen" : "Seleccionar imagen"}</strong>
                  <span>Elige una foto para acompañar tu publicación</span>
                </span>
              </div>
              <p id="comunidad-image-help" className="comunidad-image-help">
                JPG, PNG o WebP · Máximo 5 MB
              </p>
              {imageError && <p role="alert">{imageError}</p>}
              {image && (
                <div className="comunidad-image-selected">
                  <span className="comunidad-image-selected-name" title={image.name}>{image.name}</span>
                  <button type="button" onClick={() => {
                    setImage(null);
                    if (imageInputRef.current) imageInputRef.current.value = "";
                  }} aria-label={`Quitar imagen ${image.name}`}>
                    <X size={16} aria-hidden="true" /> Quitar
                  </button>
                </div>
              )}
              {preview && <img className="comunidad-post-image" src={preview} alt="Vista previa de la imagen seleccionada" />}
              {submitError && <p role="alert">{submitError}</p>}
              <div className="comunidad-composer-actions">
                <button
                  type="button"
                  onClick={() => setIsComposerOpen(false)}
                  disabled={isSaving}
                >
                  Cancelar
                </button>
                <button type="submit" disabled={isSaving || Boolean(imageError)}>
                  {isSaving ? "Publicando..." : "Publicar"}
                </button>
              </div>
              </fieldset>
            </form>
          </dialog>
        </Grow>
      )}
    </>
  );
}
