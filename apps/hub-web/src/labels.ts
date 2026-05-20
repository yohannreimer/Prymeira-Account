const statusLabels: Record<string, string> = {
  active: "Ativo",
  trial: "Teste",
  internal: "Interno",
  blocked: "Bloqueado",
  expired: "Expirado",
  cancelled: "Cancelado",
  locked: "Bloqueado"
};

const sourceLabels: Record<string, string> = {
  admin: "Admin",
  manual: "Manual",
  internal: "Interno",
  trial: "Teste",
  payment: "Pagamento",
  migration: "Migração"
};

const planLabels: Record<string, string> = {
  internal: "Interno",
  free: "Grátis",
  trial: "Teste",
  beta: "Beta",
  basic: "Básico",
  starter: "Inicial",
  pro: "Pro",
  business: "Empresarial",
  enterprise: "Corporativo"
};

const roleLabels: Record<string, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  member: "Membro",
  viewer: "Visualizador"
};

const workspaceTypeLabels: Record<string, string> = {
  individual: "Individual",
  company: "Empresa",
  business: "Empresa",
  agency: "Agência"
};

const productLabels: Record<string, string> = {
  operis: "Operis",
  orquestrador: "Velio",
  financeiro: "Fluvia",
  media: "Flowcut",
  ads: "Ads Vision",
  commerce: "Commerce Intel"
};

const auditActionLabels: Record<string, string> = {
  entitlement_upserted: "Permissão atualizada",
  entitlement_blocked: "Produto bloqueado",
  trial_granted: "Teste concedido"
};

const targetTypeLabels: Record<string, string> = {
  customer: "Cliente",
  workspace: "Área de trabalho",
  entitlement: "Permissão",
  subscription: "Assinatura"
};

function fallbackLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function labelFrom(map: Record<string, string>, value: string | null | undefined) {
  if (!value) return "—";
  return map[value] ?? fallbackLabel(value);
}

export const planOptions = [
  "internal",
  "free",
  "trial",
  "beta",
  "basic",
  "starter",
  "pro",
  "business",
  "enterprise"
];

export function formatStatusLabel(value: string | null | undefined) {
  return labelFrom(statusLabels, value);
}

export function formatSourceLabel(value: string | null | undefined) {
  return labelFrom(sourceLabels, value);
}

export function formatPlanLabel(value: string | null | undefined) {
  return labelFrom(planLabels, value);
}

export function formatRoleLabel(value: string | null | undefined) {
  return labelFrom(roleLabels, value);
}

export function formatWorkspaceTypeLabel(value: string | null | undefined) {
  return labelFrom(workspaceTypeLabels, value);
}

export function formatProductLabel(value: string | null | undefined) {
  return labelFrom(productLabels, value);
}

export function formatAuditActionLabel(value: string | null | undefined) {
  return labelFrom(auditActionLabels, value);
}

export function formatTargetTypeLabel(value: string | null | undefined) {
  return labelFrom(targetTypeLabels, value);
}
