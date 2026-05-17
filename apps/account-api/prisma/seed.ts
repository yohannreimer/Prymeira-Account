import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const products = [
  {
    productKey: "operis",
    name: "Operis",
    description: "Segundo cerebro, tarefas e organizacao pessoal.",
    appUrl: "https://operis.prymeiradigital.com.br",
    marketingUrl: "https://prymeiradigital.com.br/operis"
  },
  {
    productKey: "orquestrador",
    name: "Orquestrador",
    description: "App tecnico de orquestracao.",
    appUrl: "https://orquestrador.prymeiradigital.com.br",
    marketingUrl: "https://prymeiradigital.com.br/orquestrador"
  },
  {
    productKey: "financeiro",
    name: "Financeiro",
    description: "Gestao financeira.",
    appUrl: "https://financeiro.prymeiradigital.com.br",
    marketingUrl: "https://prymeiradigital.com.br/financeiro"
  },
  {
    productKey: "media",
    name: "Media AI",
    description: "App de videos e midia.",
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
