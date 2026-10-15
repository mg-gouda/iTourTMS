import { describe, expect, it } from "vitest";

import { pickScope, readBranchCookie, scopeArgs } from "@/server/branch-scope";

const direct = { direct: true } as const;
const viaJob = { via: (ids: string[]) => ({ job: { branchId: { in: ids } } }) };
const one = { ids: ["cai"], activeId: "cai" };
const all = { ids: ["cai", "hrg"], activeId: null };

describe("scopeArgs", () => {
  it("narrows reads to the caller's branches, keeping existing filters", () => {
    expect(scopeArgs(direct, "findMany", { where: { status: "OPEN" } }, all)).toEqual({
      where: { status: "OPEN", AND: [{ branchId: { in: ["cai", "hrg"] } }] },
    });
  });

  it("keeps the unique key at the top level for findUnique/update", () => {
    const out = scopeArgs(direct, "findUnique", { where: { id: "x" } }, one);
    expect(out.where).toEqual({ id: "x", AND: [{ branchId: { in: ["cai"] } }] });
  });

  it("appends to an existing AND, array or single", () => {
    expect(scopeArgs(direct, "count", { where: { AND: { a: 1 } } }, one).where).toEqual({
      AND: [{ a: 1 }, { branchId: { in: ["cai"] } }],
    });
  });

  it("stamps the active branch on create, scalar or relation style", () => {
    expect(scopeArgs(direct, "create", { data: { name: "n", companyId: "c" } }, one).data).toEqual({
      name: "n",
      companyId: "c",
      branchId: "cai",
    });
    expect(
      scopeArgs(direct, "create", { data: { company: { connect: { id: "c" } } } }, one).data,
    ).toEqual({ company: { connect: { id: "c" } }, branch: { connect: { id: "cai" } } });
  });

  it("stamps every row of createMany", () => {
    const out = scopeArgs(direct, "createMany", { data: [{ a: 1 }, { a: 2 }] }, one);
    expect(out.data).toEqual([
      { a: 1, branchId: "cai" },
      { a: 2, branchId: "cai" },
    ]);
  });

  it("refuses to create while viewing all branches", () => {
    expect(() => scopeArgs(direct, "create", { data: {} }, all)).toThrow(/Pick a branch/);
  });

  it("allows an explicit branch only if it is one of the caller's", () => {
    expect(scopeArgs(direct, "create", { data: { branchId: "hrg" } }, all).data).toEqual({
      branchId: "hrg",
    });
    expect(() => scopeArgs(direct, "create", { data: { branchId: "lxr" } }, all)).toThrow(
      /not one of yours/,
    );
    expect(() => scopeArgs(direct, "update", { where: { id: "x" }, data: { branchId: "lxr" } }, one)).toThrow(
      /not one of yours/,
    );
  });

  it("scopes child models through their parent and never stamps them", () => {
    const out = scopeArgs(viaJob, "create", { data: { jobId: "j" } }, one);
    expect(out).toEqual({ data: { jobId: "j" } });
    expect(scopeArgs(viaJob, "deleteMany", {}, one).where).toEqual({
      AND: [{ job: { branchId: { in: ["cai"] } } }],
    });
  });

  it("an empty scope matches nothing rather than everything", () => {
    expect(scopeArgs(direct, "findMany", {}, { ids: [], activeId: null }).where).toEqual({
      AND: [{ branchId: { in: [] } }],
    });
  });
});

describe("pickScope", () => {
  const branches = [
    { id: "cai", code: "CAI", name: "Cairo", isHq: true },
    { id: "hrg", code: "HRG", name: "Hurghada", isHq: false },
  ];

  it("uses the picked branch when it is allowed", () => {
    expect(pickScope(branches, "hrg")).toEqual({ ids: ["hrg"], activeId: "hrg" });
  });

  it("ignores a cookie naming someone else's branch", () => {
    expect(pickScope(branches, "lxr")).toEqual({ ids: ["cai", "hrg"], activeId: null });
  });

  it("a single-branch user is always in that branch", () => {
    expect(pickScope(branches.slice(1), "all")).toEqual({ ids: ["hrg"], activeId: "hrg" });
  });
});

it("readBranchCookie finds the cookie among others", () => {
  const h = new Headers({ cookie: "a=1; itms-branch=hrg; b=2" });
  expect(readBranchCookie(h)).toBe("hrg");
  expect(readBranchCookie(new Headers())).toBeUndefined();
});
