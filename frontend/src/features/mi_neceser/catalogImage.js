export function displayImageUrl(product, useOriginal = false) {
  if (useOriginal || !product.display_image_url) return product.image_url;
  const apiRoot = (import.meta.env.VITE_API_URL || "/api").replace(/\/api\/?$/, "");
  return `${apiRoot}${product.display_image_url}`;
}
