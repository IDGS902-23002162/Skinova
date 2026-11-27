import { useEffect, useState } from "react";
import Collapse from "@mui/material/Collapse";
import Fade from "@mui/material/Fade";
import { Camera, ImagePlus, LayoutGrid, List, Search } from "lucide-react";
import { useApi } from "../../../shared/hooks/useApi";
import { useMotionDuration } from "../../../shared/hooks/useMotionDuration";
import ProductCard from "../components/ProductCard";
import ProductCamera from "../components/ProductCamera";
import ProductDetails from "../components/ProductDetails";
import RoutineSelector from "../components/RoutineSelector";
import StoreSearch from "../components/StoreSearch";
import beardImage from "../assets/cuidado-barba.webp";
import feetImage from "../assets/cuidado-pies.webp";
import hairImage from "../assets/cuidado-cabello.webp";
import "./MiNeceser.css";

async function readJson(response) {
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) throw new Error(data?.error || "No se pudo completar la solicitud.");
  return data;
}

const SEARCH_MODES = [
  { value: "product", label: "Producto", placeholder: "Ej. crema hidratante, protector solar" },
  { value: "brand", label: "Marca", placeholder: "Ej. CeraVe, La Roche-Posay" },
  { value: "ingredient", label: "Ingrediente", placeholder: "Ej. niacinamida, glicerina, retinol" },
  { value: "purpose", label: "Finalidad", placeholder: "Ej. hidratante, cuidado de barba o cabello" },
];

// const CARE_SECTIONS = [
//   {
//     title: "Cuidado de la barba",
//     image: beardImage,
//     term: "barba",
//     options: [["Aceites", "aceite barba"], ["Bálsamos", "bálsamo barba"], ["Champús", "champú barba"], ["Tónicos", "tónico barba"]],
//   },
//   {
//     title: "Cuidado de los pies",
//     image: feetImage,
//     term: "pies",
//     options: [["Cremas", "crema pies"], ["Bálsamos", "bálsamo pies"], ["Exfoliantes", "exfoliante pies"]],
//   },
//   {
//     title: "Cuidado del cabello y cuero cabelludo",
//     image: hairImage,
//     term: "cabello",
//     options: [["Champús", "champú cabello"], ["Acondicionadores", "acondicionador cabello"],
//     ["Mascarillas", "mascarilla cabello"], ["Cuero cabelludo", "cuero cabelludo"]],
//   },
// ];

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
  const [mode, setMode] = useState("product");
  const [searchedQuery, setSearchedQuery] = useState("");
  const [searchedMode, setSearchedMode] = useState("product");
  const [results, setResults] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [searching, setSearching] = useState(false);
  const [catalogError, setCatalogError] = useState("");
  const [busyCode, setBusyCode] = useState("");
  const [busyProductId, setBusyProductId] = useState("");
  const [removingProductIds, setRemovingProductIds] = useState([]);
  const [selected, setSelected] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [photos, setPhotos] = useState({});
  const [camera, setCamera] = useState(null);

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

  async function search(event, requestedPage = 1, term = query.trim(), searchMode = mode) {
    event?.preventDefault();
    if (term.length < 2 || term.length > 80 || searching || uploadingPhoto) return;
    setSearching(true);
    setCatalogError("");
    if (requestedPage === 1) {
      setResults([]);
      setHasMore(false);
      setSearchedQuery(term);
      setSearchedMode(searchMode);
    }
    try {
      const params = new URLSearchParams({ q: term, mode: searchMode, page: String(requestedPage) });
      const data = await readJson(await fetchConAuth(`/mi-neceser/catalogo?${params}`));
      setResults((current) => requestedPage === 1 ? data.items : [
        ...current,
        ...data.items.filter((item) => !current.some((saved) =>
          (saved.catalog_id || saved.id) === (item.catalog_id || item.id))),
      ]);
      setPage(requestedPage);
      setHasMore(data.has_more);
    } catch (error) {
      setCatalogError(error.message);
    } finally {
      setSearching(false);
    }
  }

  async function addProduct(product, selectedRoutine) {
    setBusyCode(product.catalog_id);
    setCatalogError("");
    try {
      const saved = await readJson(await fetchConAuth("/mi-neceser/productos/catalogo", {
        method: "POST",
        body: JSON.stringify({ catalog_id: product.catalog_id, routine: selectedRoutine }),
      }));
      setProducts((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      setIsAllSelected(true);
      selectProduct(saved, false);
    } finally {
      setBusyCode("");
    }
  }

  async function removeProduct(product) {
    setBusyProductId(product.id);
    setProductsError("");
    try {
      await readJson(await fetchConAuth(`/mi-neceser/productos/${encodeURIComponent(product.id)}`, { method: "DELETE" }));
      setRemovingProductIds((current) => [...current, product.id]);
      setSelected(null);
    } catch (error) {
      setProductsError(error.message);
    } finally {
      setBusyProductId("");
    }
  }

  function finishRemoving(productId) {
    setProducts((current) => current.filter((item) => item.id !== productId));
    setRemovingProductIds((current) => current.filter((id) => id !== productId));
  }

  async function addPhoto(event) {
    event.preventDefault();
    if (uploadingPhoto || searching) return;
    const form = event.currentTarget;
    const body = new FormData(form);
    setPhotoError("");
    if (!photos.front) {
      setPhotoError("Agrega una foto del frente del producto.");
      return;
    }
    for (const [name, file] of Object.entries(photos)) body.set(name, file);
    const searchOnly = event.nativeEvent.submitter?.value === "search";
    if (searchOnly) {
      setSearchedQuery("");
      setResults([]);
      setHasMore(false);
      setCatalogError("");
    }
    if (!body.get("back")?.size) body.delete("back");
    setPhotoError("");
    if (["front", "back"].some((field) => body.get(field)?.size > 8 * 1024 * 1024)) {
      setPhotoError("Cada foto debe pesar como máximo 8 MB.");
      return;
    }
    setUploadingPhoto(true);
    try {
      const endpoint = searchOnly ? "/mi-neceser/catalogo/foto" : "/mi-neceser/productos/foto";
      const saved = await readJson(await fetchConAuth(endpoint, { method: "POST", body }));
      if (searchOnly) {
        setResults(saved.items);
        setSearchedQuery("foto");
        setSearchedMode("photo");
        if (saved.items.length) selectProduct(saved.items[0], !saved.items[0].id);
        return;
      }
      setProducts((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      setIsAllSelected(true);
      form.reset();
      setPhotos({});
      if (searchedMode === "photo") {
        setSearchedQuery("");
        setResults([]);
      }
      selectProduct(saved, false);
    } catch (error) {
      setPhotoError(error.message);
    } finally {
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

  function changeSearchMode(nextMode) {
    if (searching) return;
    setMode(nextMode);
    setSearchedQuery("");
    setResults([]);
    setHasMore(false);
    setCatalogError("");
    setPage(1);
  }

  function browseCareProducts(term) {
    if (searching || uploadingPhoto) return;
    setMode("purpose");
    setQuery(term);
    search(null, 1, term, "purpose");
  }

  const visibleProducts = products.filter((product) =>
    removingProductIds.includes(product.id) || isAllSelected || product.routine === routine || product.routine === "both");
  const savedCatalogIds = new Set(products.map((product) => product.catalog_id).filter(Boolean));

  return (
    <div className="neceser-page">
      <header className="neceser-header">
        <h1>Mi neceser</h1>
        <p className="neceser-intro">Ten a mano lo que usas para cuidarte. Guarda tus productos y revisa sus ingredientes cuando quieras.</p>
      </header>

      <section className="neceser-catalog-section" aria-labelledby="neceser-photo-title">
        <div className="neceser-section-heading">
          <h2 id="neceser-photo-title">Buscar o agregar por foto</h2>
          <p>Toma una foto de tu producto para buscarlo. Si aún no está en Skinova, puedes agregarlo con tus propias fotos.</p>
        </div>
        <form className="neceser-photo-form" onSubmit={addPhoto}>
          {[
            { name: "front", label: "Foto del frente" },
            { name: "back", label: "Foto de la etiqueta (opcional)" },
          ].map(({ name, label }) => (
            <div className="neceser-photo-field" key={name}>
              <label htmlFor={`neceser-photo-${name}`}>{label}</label>
              <div className="neceser-photo-picker">
                <input id={`neceser-photo-${name}`} type="file"
                  accept="image/jpeg,image/png,image/webp" disabled={uploadingPhoto}
                  onChange={(event) => {
                    const file = event.currentTarget.files[0];
                    if (file) setPhotos((current) => ({ ...current, [name]: file }));
                    event.currentTarget.value = "";
                  }} />
                <span className="neceser-photo-picker-action" aria-hidden="true">
                  <ImagePlus size={19} /> {photos[name] ? "Cambiar foto" : "Elegir foto"}
                </span>
                <span className="neceser-photo-filename" title={photos[name]?.name} aria-live="polite">
                  {photos[name]?.name || "JPG, PNG o WebP · hasta 8 MB"}
                </span>
              </div>
              <button type="button" className="neceser-camera-button" disabled={uploadingPhoto}
                aria-label={`Abrir cámara para ${label.toLowerCase()}`}
                onClick={() => setCamera({ name, label })}>
                <Camera size={17} aria-hidden="true" /> Abrir cámara
              </button>
            </div>
          ))}
          <label>
            Rutina
            <select name="routine" disabled={uploadingPhoto}>
              <option value="auto">Sugerir con Gemini</option>
              <option value="both">Mañana y noche</option>
              <option value="morning">Mañana</option>
              <option value="evening">Noche</option>
            </select>
          </label>
          <label className="neceser-photo-consent">
            <input type="checkbox" name="own_photo" value="yes" disabled={uploadingPhoto} />
            Tomé las fotos y autorizo que se muestren en el catálogo de Skinova.
          </label>
          <div className="neceser-detail-actions">
            <button type="submit" value="search" disabled={uploadingPhoto || searching}>
              <Search size={17} aria-hidden="true" /> Buscar por foto
            </button>
            <button type="submit" value="add" disabled={uploadingPhoto || searching}>
              <Camera size={17} aria-hidden="true" /> {uploadingPhoto ? "Analizando fotos…" : "Agregar a mi neceser"}
            </button>
          </div>
        </form>
        {uploadingPhoto && <p className="neceser-detail-status" role="status">Buscando información del producto…</p>}
        {photoError && <p className="neceser-error" role="alert">{photoError}</p>}
        {searchedMode === "photo" && searchedQuery && results.length === 0 && !uploadingPhoto && !photoError &&
          <p className="neceser-empty" role="status">No encontramos ese producto. Si tomaste las fotos, puedes agregarlo desde aquí.</p>}
      </section>

      <section className="neceser-catalog-section" aria-labelledby="neceser-catalog-title">
        <div className="neceser-section-heading">
          <h2 id="neceser-catalog-title">Buscar por texto</h2>
          <p>Busca en el catálogo de Skinova por producto, marca, ingrediente o finalidad.</p>
        </div>
        <form className="neceser-search" onSubmit={(event) => search(event)}>
          <div className="neceser-search-modes" role="group" aria-label="Buscar por">
            {SEARCH_MODES.map((option) => (
              <button key={option.value} type="button" className={mode === option.value ? "is-active" : ""}
                aria-pressed={mode === option.value} disabled={searching}
                onClick={() => changeSearchMode(option.value)}>{option.label}</button>
            ))}
          </div>
          <label htmlFor="neceser-search-query">Buscar por {SEARCH_MODES.find((option) => option.value === mode).label.toLowerCase()}</label>
          <div>
            <Search size={19} aria-hidden="true" />
            <input id="neceser-search-query" value={query} onChange={(event) => setQuery(event.target.value)}
              placeholder={SEARCH_MODES.find((option) => option.value === mode).placeholder} minLength={2} maxLength={80} required />
            <button type="submit" disabled={searching || uploadingPhoto}>{searching && page === 1 ? "Buscando..." : "Buscar"}</button>
          </div>
          {mode === "ingredient" && <p className="neceser-search-hint">Puedes escribir nombres habituales en español o el nombre INCI del ingrediente.</p>}
          {mode === "purpose" && <p className="neceser-search-hint">La finalidad se busca en las categorías registradas del catálogo.</p>}
        </form>
        {/* {CARE_SECTIONS.map(({ title, term, image, options }) => (
          <section className="neceser-care-discovery" data-care={term} key={term} aria-labelledby={`neceser-care-${term}`}>
            <img className="neceser-care-image" src={image} width="480" height="480" loading="lazy" decoding="async" alt="" />
            <h3 id={`neceser-care-${term}`}>{title}</h3>
            <div className="neceser-care-options" role="group" aria-label={title}>
              {[["Ver todos", term], ...options].map(([label, searchTerm]) => (
                <button key={searchTerm} type="button" onClick={() => browseCareProducts(searchTerm)}
                  disabled={searching || uploadingPhoto}
                  aria-pressed={searchedMode === "purpose" && searchedQuery === searchTerm}>
                  {label}
                </button>
              ))}
            </div>
          </section>
        ))} */}
        {catalogError && <p className="neceser-error" role="alert">{catalogError}</p>}
        {searchedQuery && (
          <>
            <p className="neceser-search-summary" aria-live="polite">{searchedMode === "photo" ? "Resultados por foto" :
              `Resultados por ${SEARCH_MODES.find((option) => option.value === searchedMode).label.toLowerCase()} para «${searchedQuery}»`}</p>
            {searchedMode !== "photo" && results.length === 0 && !searching && !catalogError &&
              <p className="neceser-empty">No encontramos el producto en el catálogo. Puedes agregarlo con tus propias fotos.</p>}
            <div className="neceser-product-grid">
              {results.map((product) => (
                <Fade in key={product.catalog_id || product.id} timeout={motionDuration}>
                  <div className="neceser-product-tile">
                    <ProductCard product={product} onSelect={(item) => selectProduct(item, !item.id)} />
                  </div>
                </Fade>
              ))}
            </div>
            {hasMore && <button type="button" className="neceser-more" onClick={() => search(null, page + 1, searchedQuery, searchedMode)} disabled={searching}>
              {searching ? "Cargando..." : "Ver más resultados"}
            </button>}
          </>
        )}
      </section>

      {/* <section className="neceser-catalog-section" aria-labelledby="neceser-stores-title">
        <div className="neceser-section-heading">
          <h2 id="neceser-stores-title">Buscar dónde comprar</h2>
        </div>
        <StoreSearch />
      </section> */}

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
            <div className="neceser-view-switch" role="group" aria-label="Vista de tus productos">
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
                  <ProductCard product={product} onSelect={(item) => selectProduct(item, false)} />
                </div>
              </Fade>
            </Collapse>
          ))}
        </div>
      </section>
      {camera && <ProductCamera label={camera.label} onClose={() => setCamera(null)}
        onCapture={(file) => {
          setPhotos((current) => ({ ...current, [camera.name]: file }));
          setCamera(null);
        }} />}
      {selected && (
        <ProductDetails key={selected.product.id || selected.product.catalog_id} product={selected.product}
          catalog={selected.catalog} added={savedCatalogIds.has(selected.product.catalog_id)}
          busy={(selected.catalog && busyCode === selected.product.catalog_id) || busyProductId === selected.product.id}
          onClose={() => setSelected(null)} onAdd={addProduct} onRemove={removeProduct}
          onChangeRoutine={changeProductRoutine} onSaveLabel={saveProductLabel} onReplacePhoto={replaceProductPhoto} />
      )}
    </div>
  );
}
