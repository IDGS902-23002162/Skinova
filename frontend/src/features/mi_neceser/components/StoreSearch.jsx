import { useId, useState } from "react";
import { ExternalLink, Search } from "lucide-react";

function storeLinks(query) {
  const mercadolibreTerm = query.normalize("NFD").replace(/\p{M}/gu, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const params = new URLSearchParams({ q: query });
  return [
    { name: "Mercado Libre", href: `https://listado.mercadolibre.com.mx/${mercadolibreTerm || encodeURIComponent(query)}` },
    { name: "Farmacias Guadalajara", href: `https://www.farmaciasguadalajara.com/buscar/?${params}` },
    { name: "Farmacias del Ahorro", href: `https://www.fahorro.com/catalogsearch/result/?${params}` },
  ];
}

export default function StoreSearch({ initialQuery = "" }) {
  const inputId = useId();
  const [query, setQuery] = useState(initialQuery);
  const [searched, setSearched] = useState(initialQuery);

  return (
    <>
      <form className="neceser-search neceser-store-search" onSubmit={(event) => {
        event.preventDefault();
        setSearched(query.trim());
      }}>
        <label htmlFor={inputId}>Nombre del producto o marca</label>
        <div>
          <Search size={19} aria-hidden="true" />
          <input id={inputId} type="search" value={query} maxLength={350} required
            placeholder="Ej. CeraVe crema hidratante"
            onChange={(event) => { setQuery(event.target.value); setSearched(""); }} />
          <button type="submit" disabled={!query.trim()}>Buscar en tiendas</button>
        </div>
      </form>
      {searched && (
        <div className="neceser-store-results" aria-live="polite">
          <p>Abre una tienda para ver sus resultados, precios y disponibilidad.</p>
          <div className="neceser-buy-links">
            {storeLinks(searched).map(({ name, href }) => (
              <a key={name} href={href} target="_blank" rel="noopener noreferrer">
                {name} <ExternalLink size={13} aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
