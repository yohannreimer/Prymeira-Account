const FALLBACK_PRODUCT_DESCRIPTION = "Produto Prymeira conectado à sua conta central.";

type ProductDescriptionInput = {
  productDescription?: string | null;
  presentationDescription?: string | null;
};

export function resolveProductDescription({
  productDescription,
  presentationDescription
}: ProductDescriptionInput) {
  const customDescription = productDescription?.trim();
  if (customDescription) return customDescription;

  const defaultDescription = presentationDescription?.trim();
  return defaultDescription || FALLBACK_PRODUCT_DESCRIPTION;
}
