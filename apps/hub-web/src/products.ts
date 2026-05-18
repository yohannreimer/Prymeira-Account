import {
  BadgeDollarSign,
  Brain,
  ChartNoAxesCombined,
  Clapperboard,
  Compass,
  LucideIcon,
  Megaphone,
  Settings2,
  ShoppingBag
} from "lucide-react";

export type ProductPresentation = {
  accent: string;
  category: string;
  icon: LucideIcon;
  description?: string;
};

const fallbackPresentation: ProductPresentation = {
  accent: "#3b5b52",
  category: "Produto",
  icon: Compass
};

export const productPresentationByKey: Record<string, ProductPresentation> = {
  operis: {
    accent: "#3b5b52",
    category: "Segundo cérebro",
    icon: Brain,
    description: "Seu sistema pessoal de execução estratégica. Organize projetos, tarefas e planejamento diário em um só lugar — com gamificação, integração WhatsApp e relatórios que transformam planejamento em resultado."
  },
  orquestrador: {
    accent: "#1c8b61",
    category: "Gestão técnica",
    icon: Settings2,
    description: "Gerencie sua equipe técnica de ponta a ponta. Planeje agendas, atribua técnicos, acompanhe cada atendimento em tempo real e mantenha seus clientes informados pelo portal dedicado. Sua operação sempre sob controle."
  },
  financeiro: {
    accent: "#3757a6",
    category: "Gestão financeira",
    icon: BadgeDollarSign,
    description: "Gestão financeira completa para o seu negócio. Controle contas a pagar e receber, acompanhe o fluxo de caixa, concilie extratos bancários e tome decisões com relatórios que mostram a saúde financeira da sua empresa em tempo real."
  },
  media: {
    accent: "#9b5d2e",
    category: "Vídeo e mídia",
    icon: Clapperboard
  },
  ads: {
    accent: "#8a3f54",
    category: "Performance",
    icon: Megaphone
  },
  commerce: {
    accent: "#6d6f2e",
    category: "E-commerce",
    icon: ShoppingBag
  }
};

export const productKeys = Object.keys(productPresentationByKey);

export function readProductPresentation(productKey: string) {
  return productPresentationByKey[productKey] ?? {
    ...fallbackPresentation,
    icon: productKey.includes("finance") ? ChartNoAxesCombined : fallbackPresentation.icon
  };
}
