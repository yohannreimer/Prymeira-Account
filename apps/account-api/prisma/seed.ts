import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const products = [
  {
    productKey: "operis",
    name: "Operis",
    description: "Segundo cerebro, tarefas e organizacao pessoal.",
    appUrl: "https://operis.primeiradigital.com.br",
    marketingUrl: "https://primeiradigital.com.br/operis"
  },
  {
    productKey: "orquestrador",
    name: "Orquestrador",
    description: "App tecnico de orquestracao.",
    appUrl: "https://orquestrador.primeiradigital.com.br",
    marketingUrl: "https://primeiradigital.com.br/orquestrador"
  },
  {
    productKey: "financeiro",
    name: "Financeiro",
    description: "Gestao financeira.",
    appUrl: "https://financeiro.primeiradigital.com.br",
    marketingUrl: "https://primeiradigital.com.br/financeiro"
  },
  {
    productKey: "media",
    name: "Media AI",
    description: "App de videos e midia.",
    appUrl: "https://media.primeiradigital.com.br",
    marketingUrl: "https://primeiradigital.com.br/media"
  },
  {
    productKey: "ads",
    name: "Ads Vision",
    description: "Campanhas e Meta Ads.",
    appUrl: "https://ads.primeiradigital.com.br",
    marketingUrl: "https://primeiradigital.com.br/ads"
  },
  {
    productKey: "commerce",
    name: "Commerce Intel",
    description: "Monitoramento de e-commerce.",
    appUrl: "https://commerce.primeiradigital.com.br",
    marketingUrl: "https://primeiradigital.com.br/commerce"
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
