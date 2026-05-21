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
    description: "O sistema operacional para quem executa com disciplina. Planejamento diário em blocos de tempo, rituais semanais de revisão estratégica, acompanhamento de hábitos com gamificação e check-ins via WhatsApp — tudo em um lugar para transformar intenção em resultado mensurável.",
    appUrl: "https://operis.prymeiradigital.com.br",
    marketingUrl: "https://prymeiradigital.com.br/operis"
  },
  {
    productKey: "orquestrador",
    name: "Velio",
    description: "Gerencie sua equipe técnica de ponta a ponta. Planeje agendas, atribua técnicos, acompanhe cada atendimento em tempo real e mantenha seus clientes informados pelo portal dedicado. Sua operação sempre sob controle.",
    appUrl: "https://velio.prymeiradigital.com.br",
    marketingUrl: "https://prymeiradigital.com.br/velio"
  },
  {
    productKey: "financeiro",
    name: "Fluvia",
    description: "Gestão financeira completa para o seu negócio. Controle contas a pagar e receber, acompanhe o fluxo de caixa, concilie extratos bancários e tome decisões com relatórios que mostram a saúde financeira da sua empresa em tempo real.",
    appUrl: "https://fluvia.prymeiradigital.com.br",
    marketingUrl: "https://prymeiradigital.com.br/fluvia"
  },
  {
    productKey: "media",
    name: "Flowcut",
    description: "Transforme vídeos longos em cortes prontos para publicar. O Flowcut organiza upload, corte com IA, transcrição, pacote para YouTube e publicação em um fluxo único para acelerar produção de conteúdo.",
    appUrl: "https://flowcut.prymeiradigital.com.br",
    marketingUrl: "https://prymeiradigital.com.br/flowcut"
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
  },
  {
    productKey: "crm",
    name: "Vincula",
    description: "CRM para gestao de relacionamento com clientes.",
    appUrl: "https://crm.prymeiradigital.com.br",
    marketingUrl: "https://prymeiradigital.com.br/crm"
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
