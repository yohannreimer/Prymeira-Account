import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mySupervisionGrants, revokeGrant, saveGrant } from "./supervision.service.js";

// Explicitly opt into a disposable migrated database. Never defaults to DATABASE_URL.
const databaseUrl = process.env.SUPERVISION_TEST_DATABASE_URL;
describe.skipIf(!databaseUrl)("Talk supervision PostgreSQL integration", () => {
  const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
  const supervisorId = randomUUID();
  const sellerId = randomUUID();
  const otherId = randomUUID();
  const workspaceId = randomUUID();
  const channelId = randomUUID();
  const clerkSupervisor = `supervision_test_${supervisorId}`;
  const input = { supervisorCustomerId: supervisorId, sellerCustomerId: sellerId, workspaceId, channelId, channelDisplayName: "Vendas", channelPhoneNumber: "5511999999999" };
  let grantId: string;
  beforeAll(async () => {
    await prisma.customer.createMany({ data: [
      { id: supervisorId, clerkUserId: clerkSupervisor, email: "supervisor@test.local" },
      { id: sellerId, clerkUserId: `supervision_seller_${sellerId}`, email: "seller@test.local", name: "Vendedor" },
      { id: otherId, clerkUserId: `supervision_other_${otherId}`, email: "other@test.local" }
    ] });
    await prisma.product.upsert({ where: { productKey: "talk" }, create: { productKey: "talk", name: "Talk", appUrl: "https://talk.test.local" }, update: { status: "active" } });
    await prisma.workspace.create({ data: { id: workspaceId, name: "Test workspace", slug: `supervision-test-${workspaceId}`, ownerCustomerId: sellerId } });
    await prisma.workspaceMember.create({ data: { workspaceId, customerId: sellerId, role: "owner" } });
    await prisma.workspaceProductMember.create({ data: { workspaceId, customerId: sellerId, productKey: "talk", role: "owner" } });
    await prisma.entitlement.create({ data: { workspaceId, productKey: "talk", status: "internal", source: "test" } });
  });
  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { actorClerkUserId: clerkSupervisor } });
    await prisma.workspace.deleteMany({ where: { id: workspaceId } });
    await prisma.customer.deleteMany({ where: { id: { in: [supervisorId, sellerId, otherId] } } });
    await prisma.$disconnect();
  });
  it("persists grant/audit without enrolling supervisor and isolates verified identity", async () => {
    const grant = await saveGrant(prisma, clerkSupervisor, input);
    grantId = grant.id;
    expect(grant).toMatchObject({ channelDisplayName: "Vendas", channelPhoneNumber: "5511999999999" });
    expect((await prisma.auditLog.findFirst({ where: { targetId: grant.id } }))?.action).toBe("talk_supervision.create");
    expect(await prisma.workspaceMember.count({ where: { customerId: supervisorId } })).toBe(0);
    expect(await prisma.workspaceProductMember.count({ where: { customerId: supervisorId } })).toBe(0);
    expect((await mySupervisionGrants(prisma, clerkSupervisor)).grants).toHaveLength(1);
    expect((await mySupervisionGrants(prisma, `supervision_other_${otherId}`)).grants).toEqual([]);
    await prisma.customer.update({ where: { id: sellerId }, data: { email: "changed@test.local" } });
    expect((await mySupervisionGrants(prisma, clerkSupervisor)).grants[0]?.seller_email).toBe("changed@test.local");
  });
  it("enforces unique mapping in database and rejects seller relabeling", async () => {
    await expect(prisma.talkSupervisionGrant.create({ data: input })).rejects.toMatchObject({ code: "P2002" });
    await expect(saveGrant(prisma, clerkSupervisor, { ...input, sellerCustomerId: otherId })).rejects.toMatchObject({ statusCode: 403 });
    expect(await prisma.talkSupervisionGrant.count({ where: { supervisorCustomerId: supervisorId } })).toBe(1);
  });
  it("revocation affects next lookup and reactivation is audited", async () => {
    await revokeGrant(prisma, clerkSupervisor, grantId);
    expect((await mySupervisionGrants(prisma, clerkSupervisor)).grants).toEqual([]);
    await expect(saveGrant(prisma, clerkSupervisor, input)).resolves.toMatchObject({ id: grantId, status: "active", revokedAt: null });
    expect((await prisma.auditLog.findMany({ where: { targetId: grantId }, orderBy: { createdAt: "asc" } })).map((audit) => audit.action)).toEqual(["talk_supervision.create", "talk_supervision.revoke", "talk_supervision.reactivate"]);
  });
  it("removes grants immediately on seller seat removal and preserves seller membership", async () => {
    await prisma.workspaceProductMember.update({ where: { workspaceId_customerId_productKey: { workspaceId, customerId: sellerId, productKey: "talk" } }, data: { status: "inactive" } });
    expect((await mySupervisionGrants(prisma, clerkSupervisor)).grants).toEqual([]);
    expect((await prisma.workspaceMember.findUnique({ where: { workspaceId_customerId: { workspaceId, customerId: sellerId } } }))?.status).toBe("active");
  });
});
