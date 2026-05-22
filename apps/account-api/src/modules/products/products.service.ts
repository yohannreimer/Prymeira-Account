import type { PrismaClient } from "@prisma/client";
import { ApiError } from "../../lib/errors.js";

type ProductInput = {
  productKey: string;
  name: string;
  description?: string | null;
  appUrl: string;
  marketingUrl?: string | null;
  status: string;
};

type ProductUpdateInput = Omit<ProductInput, "productKey">;

export async function listActiveProducts(prisma: PrismaClient) {
  return prisma.product.findMany({
    where: { status: "active" },
    orderBy: { name: "asc" }
  });
}

export async function findProductByKey(prisma: PrismaClient, productKey: string) {
  return prisma.product.findUnique({
    where: { productKey }
  });
}

export async function listAdminProducts(prisma: PrismaClient) {
  return prisma.product.findMany({
    orderBy: [{ status: "asc" }, { name: "asc" }]
  });
}

export async function createProduct(prisma: PrismaClient, input: ProductInput) {
  const existing = await findProductByKey(prisma, input.productKey);
  if (existing) {
    throw new ApiError(409, "CONFLICT", "A product with this key already exists.");
  }

  return prisma.product.create({
    data: {
      productKey: input.productKey,
      name: input.name,
      description: input.description ?? null,
      appUrl: input.appUrl,
      marketingUrl: input.marketingUrl ?? null,
      status: input.status
    }
  });
}

export async function updateProduct(
  prisma: PrismaClient,
  productKey: string,
  input: ProductUpdateInput
) {
  const existing = await findProductByKey(prisma, productKey);
  if (!existing) {
    throw new ApiError(404, "NOT_FOUND", "Product not found.");
  }

  return prisma.product.update({
    where: { productKey },
    data: {
      name: input.name,
      description: input.description ?? null,
      appUrl: input.appUrl,
      marketingUrl: input.marketingUrl ?? null,
      status: input.status
    }
  });
}
