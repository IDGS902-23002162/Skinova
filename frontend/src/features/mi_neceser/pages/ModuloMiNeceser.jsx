import ModuleHeader from "../../../shared/components/ModuleHeader";
import { useEffect, useRef, useState } from "react";
import Collapse from "@mui/material/Collapse";
import Fade from "@mui/material/Fade";
import { Camera, LayoutGrid, List, Search } from "lucide-react";
import { useApi } from "../../../shared/hooks/useApi";
import { useMotionDuration } from "../../../shared/hooks/useMotionDuration";
import ProductCard from "../components/ProductCard";
import ProductCamera from "../components/ProductCamera";
import ProductDetails from "../components/ProductDetails";
import RoutineSelector from "../components/RoutineSelector";
import "./MiNeceser.css";

async function readJson(response) {
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) {
    const error = new Error(data?.error || "No se pudo completar la solicitud.");
    if (!response.ok) error.status = response.status;
    throw error;
  }
  return data;
}

export default function ModuloMiNeceser() {
  const { fetchConAuth } = useApi();
  const motionDuration = useMotionDuration();
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productsError, setProductsError] = useState("");
  const [routine, setRoutine] = useState("morning");
  const [productView, setProductView] = useState("cards");
  const [isAllSelected, setIsAllSelected] = useState(true);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchRequest = useRef(null);
  const devicePhoto = useRef(null);
  const photoRequest = useRef(false);
  const [catalogError, setCatalogError] = useState("");
  const [busyCode, setBusyCode] = useState("");
  const [busyProductId, setBusyProductId] = useState("");
  const [removingProductIds, setRemovingProductIds] = useState([]);
  const [selected, setSelected] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoStatus, setPhotoStatus] = useState("");
  const [photoFailure, setPhotoFailure] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const data = await readJson(await fetchConAuth("/mi-neceser/productos", { signal: controller.signal }));
        if (!controller.signal.aborted) setProducts(data.items);
      } catch (error) {
        if (!controller.signal.aborted) setProductsError(error.message);
      } finally {
        if (!controller.signal.aborted) setLoadingProducts(false);
      }
    }
    load();
    return () => controller.abort();
  }, [fetchConAuth]);

  const searchTerm = query.trim();

  useEffect(() => {
    if (searchTerm.length < 2) return undefined;
    const controller = new AbortController();
    searchRequest.current = controller;
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: searchTerm, mode: "all" });
        const data = await readJson(await fetchConAuth(`/mi-neceser/catalogo?${params}`, {
          signal: controller.signal,
        }));
        if (controller.signal.aborted) return;
        setResults(data.items);
        setPage(1);
        setHasMore(data.has_more);
      } catch (error) {
        if (!controller.signal.aborted) setCatalogError(error.message);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [fetchConAuth, searchTerm]);

  function changeQuery(value) {
    setQuery(value);
    const term = value.trim();
    if (term === searchTerm) return;
    searchRequest.current?.abort();
    setResults([]);
    setCatalogError("");
    setHasMore(false);
    setSearching(term.length >= 2);
    setPage(1);
  }

  async function loadMore() {
    const signal = searchRequest.current?.signal;
    if (searching || !signal || signal.aborted) return;
    setSearching(true);
    setCatalogError("");
    try {
      const nextPage = page + 1;
      const params = new URLSearchParams({ q: searchTerm, mode: "all", page: String(nextPage) });
      const data = await readJson(await fetchConAuth(`/mi-neceser/catalogo?${params}`, { signal }));
      if (signal.aborted) return;
      setResults((current) => {
        const ids = new Set(current.map((item) => item.id || item.catalog_id));
        return [...current, ...data.items.filter((item) => !ids.has(item.id || item.catalog_id))];
      });
      setPage(nextPage);
      setHasMore(data.has_more);
    } catch (error) {
      if (!signal.aborted) setCatalogError(error.message);
    } finally {
      if (!signal.aborted) setSearching(false);
    }
  }

  async function addProduct(product, { openDetails = true } = {}) {
    if (busyCode) return;
    setBusyCode(product.catalog_id);
    setCatalogError("");
    try {
      const saved = await readJson(await fetchConAuth("/mi-neceser/productos/catalogo", {
        method: "POST",
        body: JSON.stringify({ catalog_id: product.catalog_id, routine: "both" }),
      }));
      setProducts((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      setIsAllSelected(true);
      if (openDetails) selectProduct(saved, false);
    } finally {
      setBusyCode("");
    }
  }

  async function addSearchResult(product) {
    try {
      await addProduct(product, { openDetails: false });
    } catch (error) {
      setCatalogError(error.message);
    }
  }

  async function removeProduct(product, { fromSearch = false } = {}) {
    if (busyProductId) return;
    setBusyProductId(product.id);
    const setError = fromSearch ? setCatalogError : setProductsError;
    setError("");
    try {
      await readJson(await fetchConAuth(`/mi-neceser/productos/${encodeURIComponent(product.id)}`, { method: "DELETE" }));
      if (visibleProducts.some((item) => item.id === product.id)) {
        setRemovingProductIds((current) => [...current, product.id]);
      } else {
        finishRemoving(product.id);
      }
      setSelected((current) => current?.product.id === product.id ? null : current);
    } catch (error) {
      setError(error.message);
    } finally {
      setBusyProductId("");
    }
  }

  function finishRemoving(productId) {
    setProducts((current) => current.filter((item) => item.id !== productId));
    setResults((current) => current.filter((item) => item.id !== productId));
    setRemovingProductIds((current) => current.filter((id) => id !== productId));
  }

  async function addPhoto(file) {
    if (!file || photoRequest.current) return;
    setPhotoFailure(null);
    if (file.size > 8 * 1024 * 1024) {
      setPhotoFailure({ message: "La foto debe pesar como máximo 8 MB." });
      return;
    }
    const body = new FormData();
    body.set("front", file);
    body.set("routine", "both");
    body.set("own_photo", "yes");
    photoRequest.current = true;
    setUploadingPhoto(true);
    try {
      const saved = await readJson(await fetchConAuth("/mi-neceser/productos/foto", { method: "POST", body }));
      setProducts((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      setIsAllSelected(true);
      const status = saved.catalog_created
        ? "El producto no estaba en el catálogo. Se agregó al catálogo y a tu neceser."
        : "Encontramos el producto en el catálogo y lo agregamos a tu neceser.";
      setCameraOpen(false);
      setPhotoStatus(status);
      setSelected({ product: saved, catalog: false, status });
    } catch (error) {
      const retryable = !error.status || error.status >= 500 || [408, 429].includes(error.status);
      setPhotoFailure({
        message: error.status ? error.message : "No se pudo completar la búsqueda por imagen. Inténtalo de nuevo.",
        retryFile: retryable ? file : null,
      });
    } finally {
      photoRequest.current = false;
      setUploadingPhoto(false);
    }
  }

  async function changeProductRoutine(product, nextRoutine) {
    const saved = await readJson(await fetchConAuth(`/mi-neceser/productos/${encodeURIComponent(product.id)}`, {
      method: "PUT",
      body: JSON.stringify({ routine: nextRoutine }),
    }));
    applySavedProduct(saved);
  }

  async function saveProductLabel(product, body) {
    const saved = await readJson(await fetchConAuth(`/mi-neceser/productos/${encodeURIComponent(product.id)}/etiqueta`, {
      method: "POST",
      body,
    }));
    applySavedProduct(saved);
    setResults((current) => current.map((item) => {
      if (item.id === saved.id) return saved;
      if (!saved.catalog_id || item.catalog_id !== saved.catalog_id) return item;
      const { back_image_url, inci, ingredients_es, warnings, side_effects, label_verification } = saved;
      return { ...item, back_image_url, inci, ingredients_es, warnings, side_effects, label_verification };
    }));
  }

  async function replaceProductPhoto(product, body) {
    const saved = await readJson(await fetchConAuth(`/mi-neceser/productos/${encodeURIComponent(product.id)}/foto`, {
      method: "POST",
      body,
    }));
    applySavedProduct(saved);
    setResults((current) => current.map((item) => {
      if (item.id === saved.id) return saved;
      if (!saved.catalog_id || item.catalog_id !== saved.catalog_id) return item;
      const { image_url, inci, ingredients_es, warnings, side_effects, label_verification } = saved;
      return { ...item, image_url, inci, ingredients_es, warnings, side_effects, label_verification };
    }));
    return saved;
  }

  function applySavedProduct(saved) {
    setProducts((current) => current.map((item) => item.id === saved.id ? saved : item));
    setSelected((current) => current?.product.id === saved.id ? { ...current, product: saved } : current);
  }

  function selectProduct(product, catalog) {
    setSelected({ product, catalog });
  }

  const visibleProducts = products.filter((product) =>
    removingProductIds.includes(product.id) || isAllSelected || product.routine === routine || product.routine === "both");
  const savedByCatalogId = new Map(products.filter((product) => product.catalog_id)
    .map((product) => [product.catalog_id, product]));

  return (
    <div className="skinova-module neceser-page">
      <ModuleHeader title="Mi neceser"
        description="Guarda tus productos de cuidado y consulta sus ingredientes y etiquetas." />

      <section className="neceser-catalog-section" aria-label="Buscar productos">
        <form className="neceser-search" role="search" onSubmit={(event) => event.preventDefault()}>
          <div>
            <Search size={19} aria-hidden="true" />
            <input id="neceser-search-query" type="search" aria-label="Buscar por producto, marca, ingrediente o finalidad"
              value={query} onChange={(event) => changeQuery(event.target.value)}
              placeholder="Buscar productos" maxLength={80} />
            <button type="button" aria-label="Buscar por imagen" aria-haspopup="dialog" title="Buscar por imagen"
              onClick={() => {
                setPhotoStatus("");
                setPhotoFailure(null);
                setCameraOpen(true);
              }}>
              <Camera size={21} aria-hidden="true" />
            </button>
          </div>
        </form>
        {photoStatus && <p className="neceser-detail-status" role="status">{photoStatus}</p>}
        {catalogError && <p className="neceser-error" role="alert">{catalogError}</p>}
        {searchTerm.length >= 2 && (
          <>
            <p className="neceser-search-summary" aria-live="polite">
              {searching && results.length === 0 ? "Buscando…" : `Resultados para «${searchTerm}»`}
            </p>
            {results.length === 0 && !searching && !catalogError &&
              <p className="neceser-empty">No encontramos productos. Puedes agregar uno con el botón de imagen.</p>}
            <div className="neceser-product-grid">
              {results.map((product) => {
                const savedProduct = product.id ? product : savedByCatalogId.get(product.catalog_id);
                const removing = removingProductIds.includes(savedProduct?.id);
                return (
                  <Fade in key={product.catalog_id || product.id} timeout={motionDuration}>
                    <div className="neceser-product-tile">
                      <ProductCard product={product} onSelect={(item) => selectProduct(item, !item.id)}
                        saved={Boolean(savedProduct) && !removing}
                        busy={loadingProducts || Boolean(busyCode || busyProductId) || removing}
                        onToggleSaved={() => savedProduct
                          ? removeProduct(savedProduct, { fromSearch: true })
                          : addSearchResult(product)} />
                    </div>
                  </Fade>
                );
              })}
            </div>
            {hasMore && <button type="button" className="neceser-more" onClick={loadMore} disabled={searching}>
              {searching ? "Cargando..." : "Ver más resultados"}
            </button>}
          </>
        )}
      </section>

      <section className="neceser-products-section" aria-labelledby="products-title">
        <div className="neceser-section-heading">
          <h2 id="products-title">Tu rutina</h2>
          <p>Encuentra tus productos de mañana y de noche.</p>
        </div>
        <div className="neceser-toolbar">
          <RoutineSelector value={routine} onChange={(nextRoutine) => {
            setRoutine(nextRoutine);
            setIsAllSelected(false);
          }} onSelectAll={() => setIsAllSelected(true)} isAllSelected={isAllSelected} />
          <div className="neceser-view-tools">
            <span className="neceser-result-count" aria-live="polite">{visibleProducts.length} {visibleProducts.length === 1 ? "producto" : "productos"}</span>
            <div className="skinova-module-segments neceser-view-switch" role="group" aria-label="Vista de tus productos">
              <button type="button" aria-pressed={productView === "cards"} aria-controls="neceser-saved-products"
                onClick={() => setProductView("cards")}>
                <LayoutGrid size={16} aria-hidden="true" /> Tarjetas
              </button>
              <button type="button" aria-pressed={productView === "list"} aria-controls="neceser-saved-products"
                onClick={() => setProductView("list")}>
                <List size={17} aria-hidden="true" /> Lista
              </button>
            </div>
          </div>
        </div>
        {productsError && <p className="neceser-error" role="alert">{productsError}</p>}
        {loadingProducts && <p className="neceser-empty" role="status">Cargando tu neceser...</p>}
        {!loadingProducts && visibleProducts.length === 0 && <p className="neceser-empty">Por aquí todavía no hay productos. Busca uno arriba y guárdalo en tu rutina.</p>}
        <div id="neceser-saved-products" className="neceser-product-grid" data-view={productView}>
          {visibleProducts.map((product) => (
            <Collapse key={product.id} in={!removingProductIds.includes(product.id)} timeout={motionDuration}
              className="neceser-product-collapse" onExited={() => finishRemoving(product.id)}>
              <Fade in timeout={motionDuration}>
                <div className="neceser-product-tile" inert={removingProductIds.includes(product.id)}>
                  <ProductCard product={product} onSelect={(item) => selectProduct(item, false)}
                    saved={!removingProductIds.includes(product.id)} busy={Boolean(busyCode || busyProductId)}
                    onToggleSaved={() => removeProduct(product)} />
                </div>
              </Fade>
            </Collapse>
          ))}
        </div>
      </section>
      {cameraOpen && (
        <ProductCamera label="Buscar por imagen" onClose={() => {
          setPhotoFailure(null);
          setCameraOpen(false);
        }}
          description="Usa una foto propia del frente. Al tomarla o elegirla, autorizas que se muestre en el catálogo de Skinova y el producto se guardará en tu neceser."
          onCapture={addPhoto} busy={uploadingPhoto} uploadError={photoFailure?.message}>
          {photoFailure?.retryFile && (
            <button type="button" disabled={uploadingPhoto} onClick={() => addPhoto(photoFailure.retryFile)}>
              Reintentar búsqueda
            </button>
          )}
          <input ref={devicePhoto} type="file" accept="image/jpeg,image/png,image/webp" hidden
            onChange={(event) => {
              const file = event.currentTarget.files[0];
              event.currentTarget.value = "";
              void addPhoto(file);
            }} />
          <button type="button" disabled={uploadingPhoto} onClick={() => devicePhoto.current.click()}>
            Desde mi dispositivo
          </button>
        </ProductCamera>
      )}
      {selected && (
        <ProductDetails key={selected.product.id || selected.product.catalog_id} product={selected.product}
          catalog={selected.catalog} status={selected.status} added={savedByCatalogId.has(selected.product.catalog_id)}
          busy={(selected.catalog && Boolean(busyCode)) || busyProductId === selected.product.id}
          onClose={() => setSelected(null)} onAdd={addProduct} onRemove={removeProduct}
          onChangeRoutine={changeProductRoutine} onSaveLabel={saveProductLabel} onReplacePhoto={replaceProductPhoto} />
      )}
    </div>
  );
}
