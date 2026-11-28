import { ExternalLink } from "lucide-react";

function storeLinks(query) {
  const mercadolibreTerm = query.normalize("NFD").replace(/\p{M}/gu, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const params = new URLSearchParams({ q: query });
  return [
    { name: "Mercado Libre", href: `https://listado.mercadolibre.com.mx/${mercadolibreTerm || encodeURIComponent(query)}` },
    { name: "Farmacias Guadalajara", href: `https://www.farmaciasguadalajara.com/buscar/?${params}` },
    { name: "Farmacias del Ahorro", href: `https://www.fahorro.com/catalogsearch/result/?${params}` },
    { name: "Amazon México", href: `https://www.amazon.com.mx/s?${new URLSearchParams({ k: query })}` },
  ];
}

export default function StoreSearch({ product }) {
  const query = [product.brand, product.name, product.quantity].filter(Boolean).join(" ");
  const directLinks = new Map((product.purchase_links || []).map((link) => [link.name, link.href]));
  return (
    <div className="neceser-buy-links">
      {storeLinks(query).map(({ name, href }) => (
        <a key={name} href={directLinks.get(name) || href} target="_blank" rel="noopener noreferrer">
          {name} <ExternalLink size={13} aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}
