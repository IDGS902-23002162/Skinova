import { useCallback, useEffect, useRef, useState } from "react";
import { useApi } from "../../../shared/hooks/useApi";

function mapPost(post) {
  const author = post.author || "Miembro de la comunidad";
  return {
    id: post.id,
    author,
    authorId: post.user_id,
    isFollowingAuthor: Boolean(post.is_following_author),
    initials: author.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toLocaleUpperCase("es-MX"),
    imageUrl: post.image_url,
    isLiked: Boolean(post.is_liked),
    likesCount: post.likes_count || 0,
    commentsCount: post.comments_count || 0,
    time: post.created_at ? new Date(post.created_at).toLocaleDateString("es-MX", { day: "numeric", month: "short" }) : "",
    topic: !post.category || post.category === "discussion" ? "General" : post.category,
    title: post.title,
    content: post.content,
    isMine: Boolean(post.is_mine),
    isFavorite: Boolean(post.is_favorite),
  };
}

async function readResponse(response, fallback) {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || fallback);
  return data;
}

export default function useTarjetComment(view, category, search) {
  const { fetchConAuth } = useApi();
  const [comments, setComments] = useState([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState("");
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const moreController = useRef(null);
  const currentView = useRef(view);

  useEffect(() => { currentView.current = view; }, [view]);

  const endpoint = useCallback((offset) => {
    const params = new URLSearchParams({ view, limit: "12", offset: String(offset) });
    if (category !== "Todos") params.set("category", category);
    if (search.trim()) params.set("search", search.trim());
    return `/comunidad/foro/posts?${params}`;
  }, [view, category, search]);

  useEffect(() => {
    const controller = new AbortController();
    moreController.current?.abort();
    async function load() {
      setLoading(true);
      setLoadingMore(false);
      setLoadMoreError("");
      setError(null);
      try {
        const data = await readResponse(await fetchConAuth(endpoint(0), { signal: controller.signal }),
          "No fue posible cargar las publicaciones.");
        if (controller.signal.aborted) return;
        setComments(data.items.map(mapPost));
        setTotal(data.pagination.total);
        setHasMore(data.pagination.has_more);
      } catch (requestError) {
        if (!controller.signal.aborted) setError(requestError.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => { controller.abort(); moreController.current?.abort(); };
  }, [endpoint, fetchConAuth, refreshKey]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return;
    const controller = new AbortController();
    moreController.current = controller;
    setLoadingMore(true);
    setLoadMoreError("");
    try {
      const data = await readResponse(await fetchConAuth(endpoint(comments.length), { signal: controller.signal }),
        "No fue posible cargar más publicaciones.");
      if (controller.signal.aborted) return;
      setComments((current) => [...new Map([...current, ...data.items.map(mapPost)].map((post) => [post.id, post])).values()]);
      setTotal(data.pagination.total);
      setHasMore(data.pagination.has_more);
    } catch (requestError) {
      if (!controller.signal.aborted) setLoadMoreError(requestError.message);
    } finally {
      if (!controller.signal.aborted) setLoadingMore(false);
    }
  }, [comments.length, endpoint, fetchConAuth, hasMore, loading, loadingMore]);

  const refresh = useCallback(() => setRefreshKey((value) => value + 1), []);

  const toggleFollow = useCallback(async (authorId, shouldFollow) => {
    const result = await readResponse(await fetchConAuth(
      `/comunidad/foro/usuarios/${encodeURIComponent(authorId)}/seguir`,
      { method: shouldFollow ? "PUT" : "DELETE" },
    ), "No se pudo actualizar a quién sigues.");
    setComments((current) => current.map((post) => post.authorId === authorId
      ? { ...post, isFollowingAuthor: result.is_following } : post));
    if (currentView.current === "following") refresh();
    return result;
  }, [fetchConAuth, refresh]);

  const createPost = useCallback(async ({ title, content, category: postCategory, image }) => {
    const body = new FormData();
    body.set("title", title);
    body.set("content", content);
    body.set("category", postCategory);
    if (image) body.set("image", image);
    const data = await readResponse(await fetchConAuth("/comunidad/foro/posts", { method: "POST", body }),
      "No fue posible publicar.");
    if (data.status === "pending_review") return data;
    refresh();
    return mapPost(data);
  }, [fetchConAuth, refresh]);

  const updatePost = useCallback(async (postId, values) => {
    await readResponse(await fetchConAuth(`/comunidad/foro/posts/${encodeURIComponent(postId)}`, {
      method: "PATCH", body: JSON.stringify(values),
    }), "No fue posible editar la publicación.");
    refresh();
  }, [fetchConAuth, refresh]);

  const deletePost = useCallback(async (postId) => {
    const response = await fetchConAuth(`/comunidad/foro/posts/${encodeURIComponent(postId)}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "No fue posible eliminar la publicación.");
    }
    refresh();
  }, [fetchConAuth, refresh]);

  const reportContent = useCallback(async (targetType, targetId, reason, details = "", medium = "content") => {
    return readResponse(await fetchConAuth("/comunidad/foro/reports", {
      method: "POST", body: JSON.stringify({ target_type: targetType, target_id: targetId, reason, details, medium }),
    }), "No fue posible enviar el reporte.");
  }, [fetchConAuth]);

  const getPost = useCallback(async (postId) => {
    const data = await readResponse(await fetchConAuth(`/comunidad/foro/posts/${encodeURIComponent(postId)}`),
      "No fue posible abrir la publicación.");
    return mapPost(data);
  }, [fetchConAuth]);

  const toggleFavorite = useCallback(async (postId, shouldBeFavorite) => {
    const data = await readResponse(await fetchConAuth(
      `/comunidad/foro/posts/${encodeURIComponent(postId)}/favorite`,
      { method: shouldBeFavorite ? "PUT" : "DELETE" },
    ), "No fue posible actualizar favoritos.");
    setComments((posts) => view === "favorites" && !data.is_favorite
      ? posts.filter((post) => post.id !== postId)
      : posts.map((post) => post.id === postId ? { ...post, isFavorite: data.is_favorite } : post));
    if (view === "favorites" && !data.is_favorite) setTotal((count) => count - 1);
    return data;
  }, [fetchConAuth, view]);

  const toggleLike = useCallback(async (postId, shouldBeLiked) => {
    const data = await readResponse(await fetchConAuth(
      `/comunidad/foro/posts/${encodeURIComponent(postId)}/like`,
      { method: shouldBeLiked ? "PUT" : "DELETE" },
    ), "No fue posible actualizar el me gusta.");
    setComments((posts) => posts.map((post) => post.id === postId
      ? { ...post, isLiked: data.is_liked, likesCount: data.likes_count } : post));
    return data;
  }, [fetchConAuth]);

  const onReplyCreated = useCallback((postId) => {
    setComments((posts) => posts.map((post) => post.id === postId
      ? { ...post, commentsCount: post.commentsCount + 1 } : post));
  }, []);

  return { comments, total, hasMore, loading, loadingMore, loadMoreError, error, loadMore, refresh,
    createPost, updatePost, deletePost, reportContent, getPost,
    toggleFavorite, toggleLike, toggleFollow, onReplyCreated };
}
