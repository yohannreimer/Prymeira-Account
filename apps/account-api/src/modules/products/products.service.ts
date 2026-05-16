import type { PrismaClient } from "@prisma/client";

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
