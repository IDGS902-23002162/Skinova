import { useEffect, useState } from "react";
import { useApi } from "../../../shared/hooks/useApi";

export default function ForumImage({ path, title, alt }) {
  const { fetchConAuth } = useApi();
  const [source, setSource] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl;
    setSource("");
    setFailed(false);
    async function load() {
      try {
        // The API returns an authenticated /api/comunidad/... path.
        const response = await fetchConAuth(path.replace(/^\/api(?=\/)/, ""), {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Image unavailable");
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setSource(objectUrl);
      } catch (error) {
        if (!controller.signal.aborted) setFailed(true);
      }
    }
    load();
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path, fetchConAuth]);
  if (failed) return <p className="comunidad-form-error">No se pudo cargar la imagen.</p>;
  return source
    ? <img className="comunidad-post-image" src={source} alt={alt || `Imagen de la publicación: ${title}`} />
    : <p role="status">Cargando imagen...</p>;
}
