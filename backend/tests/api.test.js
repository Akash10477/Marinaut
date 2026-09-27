/* Automated API tests
 * How to run: set MONGO_URI_TEST in .env (a SEPARATE test database!), then `npm test`
 * All data in that database is wiped when tests start, so never use your main database.
 */
require("dotenv").config({ quiet: true });
process.env.JWT_SECRET = process.env.JWT_SECRET || "test_secret";
process.env.ADMIN_REGISTRATION_KEY = "test-admin-key";

const { test, before, after, describe } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const request = require("supertest");

const app = require("../app");
const User = require("../models/User");
const Fine = require("../models/Fine");

const TEST_URI = process.env.MONGO_URI_TEST;

describe("MARINAUT API", { skip: !TEST_URI && "MONGO_URI_TEST not set" }, () => {
  const tokens = {};
  const ids = {};
  const api = () => request(app);
  const auth = (role) => ({ Authorization: `Bearer ${tokens[role]}` });

  before(async () => {
    if (TEST_URI === process.env.MONGO_URI) throw new Error("MONGO_URI_TEST must be different from MONGO_URI");
    await mongoose.connect(TEST_URI);
    await mongoose.connection.db.dropDatabase();
    await User.syncIndexes();

    // admin + police are inserted directly into the DB
    await User.create([
      { name: "Admin", email: "admin@test.com", password: await bcrypt.hash("admin123", 10), role: "admin" },
      { name: "Police", email: "police@test.com", password: await bcrypt.hash("police123", 10), role: "police", badgeNumber: "NP-1" }
    ]);
  });

  after(async () => {
    await mongoose.connection.db.dropDatabase();
    await mongoose.disconnect();
  });

  test("health check", async () => {
    const res = await api().get("/");
    assert.equal(res.status, 200);
  });

  test("register always creates owner (role in body ignored)", async () => {
    const res = await api().post("/api/auth/register")
      .send({ name: "Owner", email: "Owner@Test.com", password: "owner123", role: "admin" });
    assert.equal(res.status, 201);
    assert.equal(res.body.user.role, "owner");
    tokens.owner = res.body.token;
  });

  test("register validations", async () => {
    assert.equal((await api().post("/api/auth/register").send({ email: "x@y.com" })).status, 400);
    assert.equal((await api().post("/api/auth/register").send({ name: "A", email: "a@b.com", password: "1" })).status, 400);
    assert.equal((await api().post("/api/auth/register").send({ name: "A", email: "owner@test.com", password: "123456" })).status, 409);
  });

  test("portal login: wrong password 401, correct 200", async () => {
    assert.equal((await api().post("/api/auth/admin/login").send({ email: "admin@test.com", password: "bad" })).status, 401);
    for (const role of ["admin", "police"]) {
      const res = await api().post(`/api/auth/${role}/login`).send({ email: `${role}@test.com`, password: `${role}123` });
      assert.equal(res.status, 200);
      tokens[role] = res.body.token;
    }
  });

  test("each portal only accepts its own role", async () => {
    const wrong1 = await api().post("/api/auth/login").send({ email: "admin@test.com", password: "admin123" });
    assert.equal(wrong1.status, 403);
    assert.match(wrong1.body.message, /Admin portal/);
    assert.equal((await api().post("/api/auth/admin/login").send({ email: "police@test.com", password: "police123" })).status, 403);
    assert.equal((await api().post("/api/auth/police/login").send({ email: "owner@test.com", password: "owner123" })).status, 403);
  });

  test("Naval Police registration needs admin approval", async () => {
    assert.equal((await api().post("/api/auth/police/register")
      .send({ name: "New Police", email: "np@test.com", password: "np1234" })).status, 400); // badge missing
    const reg = await api().post("/api/auth/police/register")
      .send({ name: "New Police", email: "np@test.com", password: "np1234", badgeNumber: "NP-77", role: "admin" });
    assert.equal(reg.status, 201);
    assert.equal(reg.body.user.role, "police");
    assert.equal(reg.body.user.approvalStatus, "pending");
    assert.equal(reg.body.token, undefined);

    const pending = await api().post("/api/auth/police/login").send({ email: "np@test.com", password: "np1234" });
    assert.equal(pending.status, 403);
    assert.match(pending.body.message, /awaiting admin approval/);

    const list = await api().get("/api/users?approvalStatus=pending").set(auth("admin"));
    assert.equal(list.body.items.length, 1);
    assert.equal((await api().patch(`/api/users/${reg.body.user.id}/approval`).set(auth("police")).send({ status: "approved" })).status, 403);
    const ok = await api().patch(`/api/users/${reg.body.user.id}/approval`).set(auth("admin")).send({ status: "approved" });
    assert.equal(ok.status, 200);
    assert.equal((await api().post("/api/auth/police/login").send({ email: "np@test.com", password: "np1234" })).status, 200);
  });

  test("rejected police cannot log in; approval only for police", async () => {
    const reg = await api().post("/api/auth/police/register")
      .send({ name: "Bad", email: "bad@test.com", password: "bad123", badgeNumber: "NP-99" });
    await api().patch(`/api/users/${reg.body.user.id}/approval`).set(auth("admin")).send({ status: "rejected" });
    const res = await api().post("/api/auth/police/login").send({ email: "bad@test.com", password: "bad123" });
    assert.equal(res.status, 403);
    assert.match(res.body.message, /rejected/);
    const owner = await User.findOne({ email: "owner@test.com" });
    assert.equal((await api().patch(`/api/users/${owner._id}/approval`).set(auth("admin")).send({ status: "approved" })).status, 400);
  });

  test("admin registration requires the admin key", async () => {
    const body = { name: "Admin Two", email: "admin2@test.com", password: "admin123" };
    assert.equal((await api().post("/api/auth/admin/register").send(body)).status, 403);
    assert.equal((await api().post("/api/auth/admin/register").send({ ...body, adminKey: "wrong" })).status, 403);
    const res = await api().post("/api/auth/admin/register").send({ ...body, adminKey: "test-admin-key" });
    assert.equal(res.status, 201);
    assert.equal(res.body.user.role, "admin");
    assert.ok(res.body.token);
  });

  test("auth/me + token errors", async () => {
    assert.equal((await api().get("/api/auth/me")).status, 401);
    assert.equal((await api().get("/api/auth/me").set("Authorization", "Bearer abc")).status, 401);
    const res = await api().get("/api/auth/me").set(auth("owner"));
    assert.equal(res.status, 200);
    assert.equal(res.body.user.email, "owner@test.com");
  });

  test("owner adds vessel (owner comes from token)", async () => {
    const res = await api().post("/api/vessels").set(auth("owner"))
      .send({ vesselName: "MV Test", registrationNumber: "m-10001", vesselType: "Launch", capacity: 100 });
    assert.equal(res.status, 201);
    assert.equal(res.body.vessel.registrationNumber, "M-10001");
    ids.vessel = res.body.vessel._id;
  });

  test("vessel validation + duplicate", async () => {
    assert.equal((await api().post("/api/vessels").set(auth("owner")).send({ vesselName: "X" })).status, 400);
    const bad = await api().post("/api/vessels").set(auth("owner"))
      .send({ vesselName: "X", registrationNumber: "M-12345", vesselType: "Submarine", capacity: -1 });
    assert.equal(bad.status, 400);
    assert.equal(bad.body.errors.length, 2);
    const dup = await api().post("/api/vessels").set(auth("owner"))
      .send({ vesselName: "X", registrationNumber: "M-10001", vesselType: "Boat" });
    assert.equal(dup.status, 409);
    for (const bad of ["DHK-1234", "MM-12345", "15245", "M-", "M-12A45", "M 15245", "1-15245"]) {
      const r = await api().post("/api/vessels").set(auth("owner")).send({ vesselName: "X", registrationNumber: bad, vesselType: "Boat" });
      assert.equal(r.status, 400, bad);
      assert.match(r.body.errors[0], /M-15245/);
    }
    for (const good of ["b-7", "K-1234567"]) {
      const r = await api().post("/api/vessels").set(auth("owner")).send({ vesselName: "X", registrationNumber: good, vesselType: "Boat" });
      assert.equal(r.status, 201, good);
      assert.equal(r.body.vessel.registrationNumber, good.toUpperCase());
      await api().delete(`/api/vessels/${r.body.vessel._id}`).set(auth("admin"));
    }
  });

  test("capacity unit is locked by vessel type", async () => {
    const make = async (vesselType, extra = {}) => {
      const r = await api().post("/api/vessels").set(auth("owner"))
        .send({ vesselName: "Unit test", registrationNumber: `U-${Math.floor(Math.random() * 1e6)}`, vesselType, capacity: 50, ...extra });
      assert.equal(r.status, 201, vesselType);
      await api().delete(`/api/vessels/${r.body.vessel._id}`).set(auth("admin"));
      return r.body.vessel.capacityUnit;
    };
    assert.equal(await make("Launch", { capacityUnit: "tons" }), "passengers"); // locked even if the client sends another unit
    assert.equal(await make("Passenger Vessel"), "passengers");
    assert.equal(await make("Boat"), "passengers");
    assert.equal(await make("Tanker", { capacityUnit: "passengers" }), "tons");
    assert.equal(await make("Cargo Ship"), "tons");
    assert.equal(await make("Other", { capacityUnit: "tons" }), "tons"); // Other: owner's choice
    assert.equal(await make("Other"), "passengers");
    const bad = await api().post("/api/vessels").set(auth("owner"))
      .send({ vesselName: "X", registrationNumber: "U-1", vesselType: "Other", capacityUnit: "litres" });
    assert.equal(bad.status, 400);
  });

  test("changing vessel type updates the unit", async () => {
    const r = await api().post("/api/vessels").set(auth("owner"))
      .send({ vesselName: "Switch", registrationNumber: "S-1", vesselType: "Launch", capacity: 300 });
    const u = await api().patch(`/api/vessels/${r.body.vessel._id}`).set(auth("owner")).send({ vesselType: "Tanker", capacity: 900 });
    assert.equal(u.body.vessel.capacityUnit, "tons");
    await api().delete(`/api/vessels/${r.body.vessel._id}`).set(auth("admin"));
  });

  test("staff registers vessel for an owner via ownerEmail", async () => {
    const res = await api().post("/api/vessels").set(auth("admin"))
      .send({ vesselName: "MV Two", registrationNumber: "M-10002", vesselType: "Boat", ownerEmail: "owner@test.com" });
    assert.equal(res.status, 201);
    ids.vessel2 = res.body.vessel._id;
  });

  test("another owner cannot see my vessel", async () => {
    const reg = await api().post("/api/auth/register").send({ name: "Other", email: "other@test.com", password: "other123" });
    tokens.other = reg.body.token;
    assert.equal((await api().get(`/api/vessels/${ids.vessel}`).set(auth("other"))).status, 403);
    const list = await api().get("/api/vessels").set(auth("other"));
    assert.equal(list.body.items.length, 0);
  });

  test("invalid id returns 400, missing 404", async () => {
    assert.equal((await api().get("/api/vessels/abc").set(auth("admin"))).status, 400);
    assert.equal((await api().get(`/api/vessels/${new mongoose.Types.ObjectId()}`).set(auth("admin"))).status, 404);
  });

  test("violations: only admin can create", async () => {
    const body = { code: "v01", title: "Overloading", amount: 1000, severity: "Major" };
    assert.equal((await api().post("/api/violations").set(auth("police")).send(body)).status, 403);
    const res = await api().post("/api/violations").set(auth("admin")).send(body);
    assert.equal(res.status, 201);
    assert.equal(res.body.violation.code, "V01");
    ids.violation = res.body.violation._id;
    const list = await api().get("/api/violations?active=true").set(auth("owner"));
    assert.equal(list.body.items.length, 1);
  });

  test("owner cannot issue fine", async () => {
    const res = await api().post("/api/fines").set(auth("owner"))
      .send({ registrationNumber: "M-10001", violationId: ids.violation, location: "Sadarghat" });
    assert.equal(res.status, 403);
  });

  test("Naval Police issues fine by registration number", async () => {
    const res = await api().post("/api/fines").set(auth("police"))
      .send({ registrationNumber: "m-10001", violationId: ids.violation, location: "Sadarghat" });
    assert.equal(res.status, 201);
    assert.match(res.body.fine.fineNumber, /^MRN-\d{4}-000001$/);
    assert.equal(res.body.fine.amount, 1000);
    assert.equal(res.body.fine.isRepeatOffence, false);
    ids.fine = res.body.fine._id;
  });

  test("repeat offence doubles the amount", async () => {
    const res = await api().post("/api/fines").set(auth("police"))
      .send({ vesselId: ids.vessel, violationId: ids.violation, location: "Chandpur" });
    assert.equal(res.status, 201);
    assert.equal(res.body.fine.amount, 2000);
    assert.equal(res.body.fine.isRepeatOffence, true);
    ids.fine2 = res.body.fine._id;
  });

  test("fine validation", async () => {
    assert.equal((await api().post("/api/fines").set(auth("police")).send({ registrationNumber: "M-10001" })).status, 400);
    assert.equal((await api().post("/api/fines").set(auth("police"))
      .send({ registrationNumber: "M-99999", violationId: ids.violation, location: "X" })).status, 404);
  });

  test("owner sees own fines, other owner sees none", async () => {
    const mine = await api().get("/api/fines").set(auth("owner"));
    assert.equal(mine.body.pagination.total, 2);
    const other = await api().get("/api/fines").set(auth("other"));
    assert.equal(other.body.pagination.total, 0);
    assert.equal((await api().get(`/api/fines/${ids.fine}`).set(auth("other"))).status, 403);
  });

  test("public lookup shows unpaid fines without login", async () => {
    const res = await api().get("/api/public/fines/m-10001");
    assert.equal(res.status, 200);
    assert.equal(res.body.unpaidCount, 2);
    assert.equal(res.body.totalPayable, 3000);
    assert.equal(res.body.vessel.owner, undefined); // no personal info leaked
    assert.equal((await api().get("/api/public/fines/M-00000")).status, 404);
  });

  test("owner pays fine; cannot pay twice", async () => {
    assert.equal((await api().post(`/api/payments/fine/${ids.fine}`).set(auth("owner")).send({ method: "Bitcoin" })).status, 400);
    assert.equal((await api().post(`/api/payments/fine/${ids.fine}`).set(auth("owner")).send({ method: "Cash" })).status, 400);
    const res = await api().post(`/api/payments/fine/${ids.fine}`).set(auth("owner")).send({ method: "bKash" });
    assert.equal(res.status, 201);
    assert.equal(res.body.fine.status, "Paid");
    assert.equal(res.body.payment.totalAmount, 1000);
    ids.payment = res.body.payment._id;
    assert.equal((await api().post(`/api/payments/fine/${ids.fine}`).set(auth("owner")).send({ method: "bKash" })).status, 400);
  });

  test("other owner cannot pay or view receipt", async () => {
    assert.equal((await api().post(`/api/payments/fine/${ids.fine2}`).set(auth("other")).send({ method: "bKash" })).status, 403);
    assert.equal((await api().get(`/api/payments/${ids.payment}`).set(auth("other"))).status, 403);
    assert.equal((await api().get(`/api/payments/${ids.payment}`).set(auth("owner"))).status, 200);
  });

  test("overdue fine gets late fee", async () => {
    await Fine.updateOne({ _id: ids.fine2 }, { dueDate: new Date(Date.now() - 86400000) });
    const overdue = await api().get("/api/fines?status=Overdue").set(auth("admin"));
    assert.equal(overdue.body.pagination.total, 1);
    const res = await api().post(`/api/payments/fine/${ids.fine2}`).set(auth("owner")).send({ method: "Nagad" });
    assert.equal(res.status, 201);
    assert.equal(res.body.payment.lateFee, 200); // repeat offence: 10% of 2000
    assert.equal(res.body.payment.totalAmount, 2200);
  });

  test("late fee keeps growing: 5% per 30 days (normal), 10% (repeat)", async () => {
    const { calcLateFee } = require("../utils/lateFee");
    const DAY = 86400000;
    const now = new Date("2026-06-01T00:00:00Z");
    const fine = (daysLate, isRepeatOffence = false, status = "Unpaid") =>
      ({ amount: 10000, status, isRepeatOffence, dueDate: new Date(now - daysLate * DAY) });

    assert.equal(calcLateFee(fine(-5), now).lateFee, 0);
    assert.equal(calcLateFee(fine(1), now).lateFee, 500); // 1st period: 5%
    assert.equal(calcLateFee(fine(29), now).lateFee, 500);
    assert.equal(calcLateFee(fine(30), now).lateFee, 1000); // 2nd period: 10%
    assert.equal(calcLateFee(fine(65), now).periods, 3);
    assert.equal(calcLateFee(fine(65), now).lateFee, 1500); // 3 × 5%
    assert.equal(calcLateFee(fine(65, true), now).lateFee, 3000); // repeat: 3 × 10%
    assert.equal(calcLateFee(fine(65, false, "Paid"), now).lateFee, 0);

    // API: normal fine 65 days overdue -> 15% extra
    const f = await api().post("/api/fines").set(auth("police"))
      .send({ registrationNumber: "M-10002", violationId: ids.violation, location: "Mawa" });
    await Fine.updateOne({ _id: f.body.fine._id }, { dueDate: new Date(Date.now() - 65 * DAY) });
    const detail = await api().get(`/api/fines/${f.body.fine._id}`).set(auth("owner"));
    assert.equal(detail.body.fine.lateFeeInfo.periods, 3);
    assert.equal(detail.body.fine.lateFeeInfo.ratePercent, 5);
    assert.equal(detail.body.fine.totalPayable, 1150);
    const pub = await api().get("/api/public/fines/M-10002");
    assert.equal(pub.body.fines[0].payable, 1150);
    const pay = await api().post(`/api/payments/fine/${f.body.fine._id}`).set(auth("owner")).send({ method: "Card" });
    assert.equal(pay.body.payment.lateFee, 150);
    assert.equal(pay.body.payment.totalAmount, 1150);
  });

  test("admin cancels unpaid fine; paid fine cannot be cancelled", async () => {
    const f = await api().post("/api/fines").set(auth("police"))
      .send({ registrationNumber: "M-10002", violationId: ids.violation, location: "Barishal" });
    assert.equal((await api().patch(`/api/fines/${f.body.fine._id}/cancel`).set(auth("admin")).send({})).status, 400);
    const ok = await api().patch(`/api/fines/${f.body.fine._id}/cancel`).set(auth("admin")).send({ reason: "Recorded in error" });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.fine.status, "Cancelled");
    assert.equal((await api().patch(`/api/fines/${ids.fine}/cancel`).set(auth("admin")).send({ reason: "x" })).status, 400);
    assert.equal((await api().patch(`/api/fines/${ids.fine}/cancel`).set(auth("police")).send({ reason: "x" })).status, 403);
  });

  test("vessel with fines cannot be deleted; suspend works", async () => {
    assert.equal((await api().delete(`/api/vessels/${ids.vessel}`).set(auth("admin"))).status, 400);
    const res = await api().patch(`/api/vessels/${ids.vessel}/status`).set(auth("admin")).send({ status: "Suspended" });
    assert.equal(res.body.vessel.status, "Suspended");
    assert.equal((await api().patch(`/api/vessels/${ids.vessel}/status`).set(auth("owner")).send({ status: "Active" })).status, 403);
  });

  test("owner updates vessel but not registration number", async () => {
    const res = await api().patch(`/api/vessels/${ids.vessel}`).set(auth("owner"))
      .send({ route: "Dhaka - Chandpur", registrationNumber: "M-55555" });
    assert.equal(res.status, 200);
    assert.equal(res.body.vessel.route, "Dhaka - Chandpur");
    assert.equal(res.body.vessel.registrationNumber, "M-10001");
  });

  test("dashboard per role", async () => {
    const admin = await api().get("/api/dashboard").set(auth("admin"));
    assert.equal(admin.status, 200);
    assert.equal(admin.body.totalCollected, 4350);
    assert.equal(admin.body.fines.Paid.count, 3);
    assert.equal(admin.body.fines.Cancelled.count, 1);
    assert.equal(admin.body.users.owner, 2);
    assert.equal(admin.body.users.police, 3);
    assert.equal(admin.body.pendingApprovals, 0);
    assert.equal(admin.body.monthlyCollection.length, 6);
    const owner = await api().get("/api/dashboard").set(auth("owner"));
    assert.equal(owner.body.role, "owner");
    assert.equal(owner.body.vessels.total, 2);
  });

  test("admin manages users; disabled user is blocked", async () => {
    assert.equal((await api().get("/api/users").set(auth("police"))).status, 403);
    const created = await api().post("/api/users").set(auth("admin"))
      .send({ name: "New Police", email: "new@test.com", password: "pass123", role: "police", badgeNumber: "NP-9" });
    assert.equal(created.body.user.approvalStatus, "approved");
    assert.equal(created.status, 201);
    const other = await User.findOne({ email: "other@test.com" });
    await api().patch(`/api/users/${other._id}/status`).set(auth("admin")).send({ isActive: false });
    assert.equal((await api().get("/api/auth/me").set(auth("other"))).status, 401);
    assert.equal((await api().post("/api/auth/login").send({ email: "other@test.com", password: "other123" })).status, 403);
  });

  test("admin searches users by name, email, phone or badge", async () => {
    const byName = await api().get("/api/users?search=new pol").set(auth("admin"));
    assert.ok(byName.body.items.some((u) => u.email === "np@test.com"));
    const byBadge = await api().get("/api/users?search=NP-77").set(auth("admin"));
    assert.equal(byBadge.body.items.length, 1);
    const byEmail = await api().get("/api/users?search=owner@test").set(auth("admin"));
    assert.equal(byEmail.body.items[0].role, "owner");
    const combined = await api().get("/api/users?search=test.com&role=admin").set(auth("admin"));
    assert.ok(combined.body.items.every((u) => u.role === "admin"));
    assert.equal((await api().get("/api/users?search=(((").set(auth("admin"))).status, 200); // regex-safe
  });

  test("admin removes users (only when no linked records)", async () => {
    const me = await User.findOne({ email: "admin@test.com" });
    assert.equal((await api().delete(`/api/users/${me._id}`).set(auth("admin"))).status, 400); // cannot remove yourself

    const owner = await User.findOne({ email: "owner@test.com" });
    const blocked = await api().delete(`/api/users/${owner._id}`).set(auth("admin"));
    assert.equal(blocked.status, 400);
    assert.match(blocked.body.message, /vessel/);
    assert.equal(blocked.body.canForce, true);
    assert.equal(blocked.body.confirmWith, "owner@test.com");

    const police = await User.findOne({ email: "police@test.com" });
    assert.match((await api().delete(`/api/users/${police._id}`).set(auth("admin"))).body.message, /issued fine/);

    const rejected = await User.findOne({ email: "bad@test.com" });
    assert.equal((await api().delete(`/api/users/${rejected._id}`).set(auth("police"))).status, 403);
    const ok = await api().delete(`/api/users/${rejected._id}`).set(auth("admin"));
    assert.equal(ok.status, 200);
    assert.equal(await User.findById(rejected._id), null);
    assert.equal((await api().delete(`/api/users/${rejected._id}`).set(auth("admin"))).status, 404);
  });

  test("payments list is scoped", async () => {
    assert.equal((await api().get("/api/payments").set(auth("owner"))).body.pagination.total, 3);
    assert.equal((await api().get("/api/payments").set(auth("admin"))).body.pagination.total, 3);
  });

  test("admin force-removes a vessel with fines (needs reg number)", async () => {
    // create a separate owner + vessel + fine + payment
    const reg = await api().post("/api/auth/register").send({ name: "Temp Owner", email: "temp@test.com", password: "temp123" });
    const tempAuth = { Authorization: `Bearer ${reg.body.token}` };
    const v = await api().post("/api/vessels").set(tempAuth).send({ vesselName: "Temp", registrationNumber: "Z-9001", vesselType: "Boat" });
    const f1 = await api().post("/api/fines").set(auth("police")).send({ registrationNumber: "Z-9001", violationId: ids.violation, location: "A" });
    await api().post("/api/fines").set(auth("police")).send({ registrationNumber: "Z-9001", violationId: ids.violation, location: "B" });
    await api().post(`/api/payments/fine/${f1.body.fine._id}`).set(tempAuth).send({ method: "bKash" });

    const noForce = await api().delete(`/api/vessels/${v.body.vessel._id}`).set(auth("admin"));
    assert.equal(noForce.status, 400);
    assert.deepEqual(noForce.body.linked, { vessels: 1, fines: 2, payments: 1 });
    assert.equal((await api().delete(`/api/vessels/${v.body.vessel._id}?force=true&confirm=Z-1234`).set(auth("admin"))).status, 400);
    assert.equal((await api().delete(`/api/vessels/${v.body.vessel._id}?force=true&confirm=z-9001`).set(auth("police"))).status, 403);

    const ok = await api().delete(`/api/vessels/${v.body.vessel._id}?force=true&confirm=z-9001`).set(auth("admin"));
    assert.equal(ok.status, 200);
    assert.deepEqual(ok.body.removed, { vessels: 1, fines: 2, payments: 1 });
    assert.equal(await Fine.countDocuments({ vessel: v.body.vessel._id }), 0);
    assert.equal((await api().get("/api/public/fines/Z-9001")).status, 404);
  });

  test("admin force-removes an owner with all vessels, fines, payments (needs email)", async () => {
    const tempAuth = { Authorization: `Bearer ${(await api().post("/api/auth/login").send({ email: "temp@test.com", password: "temp123" })).body.token}` };
    const v1 = await api().post("/api/vessels").set(tempAuth).send({ vesselName: "T1", registrationNumber: "Z-9101", vesselType: "Launch" });
    await api().post("/api/vessels").set(tempAuth).send({ vesselName: "T2", registrationNumber: "Z-9102", vesselType: "Tanker" });
    const f = await api().post("/api/fines").set(auth("police")).send({ vesselId: v1.body.vessel._id, violationId: ids.violation, location: "C" });
    await api().post(`/api/payments/fine/${f.body.fine._id}`).set(tempAuth).send({ method: "Nagad" });

    const temp = await User.findOne({ email: "temp@test.com" });
    const noConfirm = await api().delete(`/api/users/${temp._id}?force=true`).set(auth("admin"));
    assert.equal(noConfirm.status, 400);
    const ok = await api().delete(`/api/users/${temp._id}?force=true&confirm=TEMP@test.com`).set(auth("admin"));
    assert.equal(ok.status, 200);
    assert.deepEqual(ok.body.removed, { vessels: 2, fines: 1, payments: 1 });
    assert.equal(await User.findById(temp._id), null);
    assert.equal((await api().post("/api/auth/login").send({ email: "temp@test.com", password: "temp123" })).status, 401);

    // Naval Police cannot be removed even with force
    const police = await User.findOne({ email: "police@test.com" });
    assert.equal((await api().delete(`/api/users/${police._id}?force=true&confirm=police@test.com`).set(auth("admin"))).status, 400);
  });

  test("payments list is still scoped after removals", async () => {
    assert.equal((await api().get("/api/payments").set(auth("owner"))).body.pagination.total, 3);
    assert.equal((await api().get("/api/payments").set(auth("admin"))).body.pagination.total, 3);
  });

  test("audit log records key actions (admin only, read-only)", async () => {
    assert.equal((await api().get("/api/audit-logs").set(auth("police"))).status, 403);
    assert.equal((await api().get("/api/audit-logs").set(auth("owner"))).status, 403);

    const all = await api().get("/api/audit-logs?limit=100").set(auth("admin"));
    assert.equal(all.status, 200);
    const actions = new Set(all.body.items.map((l) => l.action));
    for (const a of ["LOGIN_SUCCESS", "LOGIN_FAILED", "USER_REGISTERED", "ADMIN_KEY_REJECTED", "USER_APPROVED", "USER_REJECTED",
      "USER_CREATED", "USER_DEACTIVATED", "USER_REMOVED", "VESSEL_CREATED", "VESSEL_UPDATED", "VESSEL_SUSPENDED", "VESSEL_REMOVED",
      "VIOLATION_CREATED", "FINE_ISSUED", "FINE_CANCELLED", "PAYMENT_RECORDED"]) {
      assert.ok(actions.has(a), `missing ${a}`);
    }
    // newest first
    const times = all.body.items.map((l) => new Date(l.createdAt).getTime());
    assert.deepEqual(times, [...times].sort((a, b) => b - a));

    // the fine-issued log records who issued it and for which vessel
    const fineLogs = await api().get("/api/audit-logs?entityType=fine&action=FINE_ISSUED").set(auth("admin"));
    const first = fineLogs.body.items.at(-1);
    assert.equal(first.actorRole, "police");
    assert.equal(first.actorName, "Police");
    assert.equal(first.details.vessel, "M-10001");

    // vessel update -> only the changed fields
    const upd = await api().get("/api/audit-logs?action=VESSEL_UPDATED&search=M-10001").set(auth("admin"));
    assert.deepEqual(upd.body.items.at(-1).details.route, { from: null, to: "Dhaka - Chandpur" });

    // the log survives a force delete (user is gone but the name remains)
    const removed = await api().get("/api/audit-logs?search=temp@test.com&action=USER_REMOVED").set(auth("admin"));
    assert.equal(removed.body.items[0].details.forced, true);
    assert.equal(removed.body.items[0].details.vessels, 2);

    // passwords are never saved in failed-login entries
    const failed = await api().get("/api/audit-logs?action=LOGIN_FAILED").set(auth("admin"));
    assert.ok(!JSON.stringify(failed.body).includes("bad"));

    // date filter
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    assert.equal((await api().get(`/api/audit-logs?from=${tomorrow}`).set(auth("admin"))).body.pagination.total, 0);

    // cannot be edited or deleted
    const id = all.body.items[0]._id;
    assert.equal((await api().delete(`/api/audit-logs/${id}`).set(auth("admin"))).status, 404);
    assert.equal((await api().patch(`/api/audit-logs/${id}`).set(auth("admin")).send({})).status, 404);
  });

  test("public receipt verification (QR)", async () => {
    const pay = (await api().get("/api/payments").set(auth("owner"))).body.items[0];
    const res = await api().get(`/api/public/verify/${pay.transactionId.toLowerCase()}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.valid, true);
    assert.equal(res.body.receipt.transactionId, pay.transactionId);
    assert.equal(res.body.receipt.totalAmount, pay.totalAmount);
    assert.ok(res.body.receipt.registrationNumber);
    assert.ok(!JSON.stringify(res.body).includes("owner@test.com")); // no personal info

    const fake = await api().get("/api/public/verify/TXNFAKE123");
    assert.equal(fake.status, 404);
    assert.equal(fake.body.valid, false);
  });

  test("public stats for homepage (no personal info)", async () => {
    const res = await api().get("/api/public/stats");
    assert.equal(res.status, 200);
    for (const k of ["vessels", "finesIssued", "finesPaid", "collected", "paidRate"]) assert.equal(typeof res.body[k], "number", k);
    assert.ok(res.body.paidRate >= 0 && res.body.paidRate <= 100);
    assert.ok(res.body.finesPaid <= res.body.finesIssued);
    assert.ok(!JSON.stringify(res.body).includes("@"));
  });

  test("unknown route 404, bad JSON 400", async () => {
    assert.equal((await api().get("/api/nothing")).status, 404);
    const res = await api().post("/api/auth/login").set("Content-Type", "application/json").send("{bad json");
    assert.equal(res.status, 400);
  });
});
