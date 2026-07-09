import type { Env } from "../../env.js";
import type { AccessDecision } from "../access/access.types.js";

export const demoProducts = [
  {
    product_key: "base",
    name: "Baase",
    description: "Company operating base",
    app_url: "http://localhost:5190",
    marketing_url: "http://localhost:5175/products/base"
  },
  {
    product_key: "media",
    name: "Flowcut",
    description: "Video content studio",
    app_url: "http://localhost:5177",
    marketing_url: "http://localhost:5175/products/media"
  },
  {
    product_key: "financeiro",
    name: "Fluvia",
    description: "Financial operations",
    app_url: "http://localhost:5173/m/financeiro",
    marketing_url: "http://localhost:5175/products/financeiro"
  },
  {
    product_key: "orquestrador",
    name: "Velio",
    description: "Service orchestration",
    app_url: "http://localhost:5173/m/tecnico",
    marketing_url: "http://localhost:5175/products/orquestrador"
  },
  {
    product_key: "crm",
    name: "Vincula CRM",
    description: "Commercial pipeline",
    app_url: "http://localhost:5174",
    marketing_url: "http://localhost:5175/products/crm"
  },
  {
    product_key: "operis",
    name: "Operis",
    description: "Productivity operating system",
    app_url: "http://localhost:5178",
    marketing_url: "http://localhost:5175/products/operis"
  },
  {
    product_key: "talk",
    name: "Prymeira Talk",
    description: "Customer conversations",
    app_url: "http://localhost:5176",
    marketing_url: "http://localhost:5175/products/talk"
  }
] as const;

export function demoCustomer(env: Env) {
  return {
    id: env.DEMO_USER_ID,
    clerkUserId: env.DEMO_USER_ID,
    email: env.DEMO_EMAIL,
    name: env.DEMO_NAME
  };
}

export function demoWorkspace(env: Env) {
  return {
    id: env.DEMO_WORKSPACE_ID,
    name: env.DEMO_WORKSPACE_NAME,
    type: "demo",
    role: "owner"
  };
}

export function demoAccessDecision(env: Env, productKey: string): AccessDecision {
  const product = demoProducts.find((item) => item.product_key === productKey);

  return {
    allowed: true,
    product_key: productKey,
    status: "active",
    plan: "demo",
    source: "demo",
    limits: {},
    seats_limit: demoProducts.length,
    workspace_id: env.DEMO_WORKSPACE_ID,
    workspace_role: "owner",
    product_role: "admin",
    reason: "demo_mode",
    upgrade_url: product?.marketing_url ?? `${env.VITE_PRYMEIRA_HUB_URL}/products/${productKey}`
  };
}

export function demoProductsResponse(env: Env) {
  const customer = demoCustomer(env);
  const workspace = demoWorkspace(env);

  return {
    customer: {
      id: customer.id,
      email: customer.email,
      name: customer.name
    },
    workspace,
    products: demoProducts.map((product) => ({
      ...product,
      ...demoAccessDecision(env, product.product_key)
    }))
  };
}
