import { PrismaClient } from "@prisma/client";
import { createClerkClient } from "@clerk/backend";
import { loadEnv } from "../env.js";
import { upsertEntitlement } from "../modules/entitlements/entitlements.service.js";
import { ensureDefaultWorkspaceForCustomer } from "../modules/workspaces/workspaces.service.js";

const prisma = new PrismaClient();

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

async function main() {
  const env = loadEnv();
  const args = parseArgs(process.argv.slice(2));
  const clerkUserId = args.clerkUserId ?? process.env.CLERK_USER_ID;
  const productKey = args.productKey ?? process.env.PRYMEIRA_PRODUCT_KEY ?? "operis";
  const plan = args.plan ?? "internal";
  const source = args.source ?? "internal";
  const seatsLimit = args.seatsLimit ?? 1;

  if (!clerkUserId) {
    throw new Error("Missing Clerk user id. Pass --clerk-user-id=user_... or set CLERK_USER_ID.");
  }

  const clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });
  const clerkUser = await clerk.users.getUser(clerkUserId);
  const email = clerkUser.primaryEmailAddress?.emailAddress;
  const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null;

  if (!email) {
    throw new Error(`Clerk user ${clerkUserId} has no primary email.`);
  }

  const product = await prisma.product.findUnique({ where: { productKey } });
  if (!product) {
    throw new Error(`Product ${productKey} does not exist. Run prisma:seed first.`);
  }

  console.log(`Clerk user: ${clerkUserId}`);
  console.log(`Email: ${email}`);
  console.log(`Product: ${productKey}`);
  console.log(`Mode: ${args.apply ? "apply" : "dry-run"}`);

  if (!args.apply) {
    console.log("Dry run complete. Re-run with --apply to write customer, workspace, seat, and entitlement.");
    return;
  }

  const customer = await prisma.customer.upsert({
    where: { clerkUserId },
    update: { email, name },
    create: { clerkUserId, email, name }
  });
  const workspaceContext = await ensureDefaultWorkspaceForCustomer(prisma, customer);
  const entitlement = await upsertEntitlement(
    prisma,
    { clerkUserId },
    {
      workspaceId: workspaceContext.workspace.id,
      productKey,
      status: "internal",
      plan,
      source,
      seatsLimit,
      limits: {},
      metadata: { bootstrap: true }
    }
  );

  console.log("Access granted:");
  console.log(`- customer_id: ${customer.id}`);
  console.log(`- workspace_id: ${workspaceContext.workspace.id}`);
  console.log(`- entitlement_id: ${entitlement.id}`);
}

function parseArgs(args: string[]) {
  const parsed: {
    clerkUserId?: string;
    productKey?: string;
    plan?: string;
    source?: string;
    seatsLimit?: number;
    apply: boolean;
  } = { apply: false };

  for (const arg of args) {
    if (arg === "--apply") {
      parsed.apply = true;
    } else if (arg.startsWith("--clerk-user-id=")) {
      parsed.clerkUserId = arg.slice("--clerk-user-id=".length).trim();
    } else if (arg.startsWith("--product-key=")) {
      parsed.productKey = arg.slice("--product-key=".length).trim();
    } else if (arg.startsWith("--plan=")) {
      parsed.plan = arg.slice("--plan=".length).trim();
    } else if (arg.startsWith("--source=")) {
      parsed.source = arg.slice("--source=".length).trim();
    } else if (arg.startsWith("--seats-limit=")) {
      parsed.seatsLimit = Number.parseInt(arg.slice("--seats-limit=".length), 10);
      if (!Number.isInteger(parsed.seatsLimit) || parsed.seatsLimit < 1) {
        throw new Error("--seats-limit must be a positive integer.");
      }
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return parsed;
}
