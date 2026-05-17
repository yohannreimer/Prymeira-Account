import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";

config({ path: resolve(process.cwd(), "../../.env") });
config();

const prisma = new PrismaClient();

const products = [
  {
    productKey: "operis",
    name: "Operis",
    description: "Segundo cérebro, tarefas e organização pessoal.",
    appUrl: "https://operis.prymeiradigital.com.br",
    marketingUrl: "https://prymeiradigital.com.br/operis"
  },
  {
    productKey: "orquestrador",
    name: "Velio",
    description: "Gestão de equipe técnica.",
    appUrl: "https://velio.prymeiradigital.com.br",
    marketingUrl: "https://prymeiradigital.com.br/velio"
  },
  {
    productKey: "financeiro",
    name: "Fluvia",
    description: "Gestão financeira.",
    appUrl: "https://fluvia.prymeiradigital.com.br",
    marketingUrl: "https://prymeiradigital.com.br/fluvia"
  },
  {
    productKey: "media",
    name: "Media AI",
    description: "App de vídeos e mídia.",
    appUrl: "https://media.prymeiradigital.com.br",
    marketingUrl: "https://prymeiradigital.com.br/media"
  },
  {
    productKey: "ads",
    name: "Ads Vision",
    description: "Campanhas e Meta Ads.",
    appUrl: "https://ads.prymeiradigital.com.br",
    marketingUrl: "https://prymeiradigital.com.br/ads"
  },
  {
    productKey: "commerce",
    name: "Commerce Intel",
    description: "Monitoramento de e-commerce.",
    appUrl: "https://commerce.prymeiradigital.com.br",
    marketingUrl: "https://prymeiradigital.com.br/commerce"
  }
];

async function main() {
  for (const product of products) {
    await prisma.product.upsert({
      where: { productKey: product.productKey },
      update: {
        name: product.name,
        description: product.description,
        appUrl: product.appUrl,
        marketingUrl: product.marketingUrl,
        status: "active"
      },
      create: {
        ...product,
        status: "active"
      }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
