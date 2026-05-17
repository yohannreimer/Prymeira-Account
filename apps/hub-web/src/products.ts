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
};

const fallbackPresentation: ProductPresentation = {
  accent: "#3b5b52",
  category: "Produto",
  icon: Compass
};

export const productPresentationByKey: Record<string, ProductPresentation> = {
  operis: {
    accent: "#3b5b52",
    category: "Segundo cerebro",
    icon: Brain
  },
  orquestrador: {
    accent: "#1c8b61",
    category: "Operacao tecnica",
    icon: Settings2
  },
  financeiro: {
    accent: "#3757a6",
    category: "ERP financeiro",
    icon: BadgeDollarSign
  },
  media: {
    accent: "#9b5d2e",
    category: "Video e midia",
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

export function readProductPresentation(productKey: string) {
  return productPresentationByKey[productKey] ?? {
    ...fallbackPresentation,
    icon: productKey.includes("finance") ? ChartNoAxesCombined : fallbackPresentation.icon
  };
}
