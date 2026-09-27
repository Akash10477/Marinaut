/* Fill the database with demo data
 *   npm run seed          -> inserts demo data only if the DB is empty
 *   npm run seed:fresh    -> DELETES ALL DATA first, then inserts demo data (careful!)
 */
const dotenv = require("dotenv");
dotenv.config({ quiet: true });

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Vessel = require("../models/Vessel");
const Violation = require("../models/Violation");
const Fine = require("../models/Fine");
const Payment = require("../models/Payment");
const Counter = require("../models/Counter");
const AuditLog = require("../models/AuditLog");

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n) => new Date(Date.now() - n * DAY);

// Sample amounts — adjust to the real rules for your deployment
const VIOLATIONS = [
  { code: "V01", title: "Passenger overloading", description: "Carrying more passengers than approved capacity", amount: 20000, severity: "Major" },
  { code: "V02", title: "Insufficient life-saving equipment", description: "Not enough life jackets / life buoys on board", amount: 10000, severity: "Major" },
  { code: "V03", title: "No valid registration or fitness certificate", description: "Operating without valid registration / survey certificate", amount: 50000, severity: "Critical" },
  { code: "V04", title: "Unlicensed master or driver", description: "Vessel operated by a person without a valid licence", amount: 25000, severity: "Critical" },
  { code: "V05", title: "Night navigation without lights", description: "Sailing at night without required navigation lights", amount: 8000, severity: "Major" },
  { code: "V06", title: "Sailing during storm warning", description: "Departing or sailing while a weather warning signal is in force", amount: 50000, severity: "Critical" },
  { code: "V07", title: "Missing fire extinguisher", description: "No working fire-fighting equipment on board", amount: 5000, severity: "Minor" },
  { code: "V08", title: "Water pollution / oil discharge", description: "Discharging oil, waste or garbage into the river", amount: 100000, severity: "Critical" },
  { code: "V09", title: "No passenger list or cargo manifest", description: "Required passenger list or cargo manifest not maintained", amount: 3000, severity: "Minor" },
  { code: "V10", title: "Over-speeding in restricted zone", description: "Exceeding speed limit near ghats or restricted areas", amount: 5000, severity: "Minor" }
];

const run = async () => {
  const fresh = process.argv.includes("--fresh");
  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Connected to DB: ${mongoose.connection.name}`);

  if (fresh) {
    await Promise.all([User, Vessel, Violation, Fine, Payment, Counter, AuditLog].map((M) => M.deleteMany({})));
    console.log("Old data removed (--fresh)");
  } else if (await User.exists({})) {
    console.log("DB already has data. Skipping. (Use `npm run seed:fresh` to reset — this DELETES all data)");
    return mongoose.disconnect();
  }

  const hash = (p) => bcrypt.hash(p, 10);

  // ---------- users ----------
  const [admin, police, police2, owner, owner2] = await User.create([
    { name: "System Admin", email: "admin@marinaut.gov.bd", password: await hash("admin123"), role: "admin" },
    { name: "SI Rahim Uddin", email: "police@marinaut.gov.bd", password: await hash("police123"), role: "police", badgeNumber: "NP-1021", phone: "01711000001" },
    { name: "ASI Nasrin Akter", email: "police2@marinaut.gov.bd", password: await hash("police123"), role: "police", badgeNumber: "NP-2207", phone: "01711000002" },
    { name: "Karim Shipping Lines", email: "owner@marinaut.com", password: await hash("owner123"), role: "owner", phone: "01811000001" },
    { name: "Padma Launch Service", email: "owner2@marinaut.com", password: await hash("owner123"), role: "owner", phone: "01811000002" }
  ]);

  // registered via the Naval Police portal, waiting for admin approval
  await User.create({
    name: "Constable Jahid Hasan", email: "police3@marinaut.gov.bd", password: await hash("police123"),
    role: "police", badgeNumber: "NP-3310", phone: "01711000003", approvalStatus: "pending"
  });

  // ---------- violations ----------
  const violations = await Violation.create(VIOLATIONS);
  const v = Object.fromEntries(violations.map((x) => [x.code, x]));

  // ---------- vessels ----------
  const [sundarban, greenLine, karnaphuli, padma] = await Vessel.create([
    { vesselName: "MV Sundarban 10", registrationNumber: "M-15245", vesselType: "Launch", owner: owner._id, route: "Dhaka - Barishal", capacity: 800 },
    { vesselName: "MV Green Line", registrationNumber: "M-20871", vesselType: "Passenger Vessel", owner: owner._id, route: "Dhaka - Barishal", capacity: 600 },
    { vesselName: "MV Karnaphuli Cargo", registrationNumber: "M-33019", vesselType: "Cargo Ship", owner: owner._id, route: "Chattogram - Mongla", capacity: 1200 },
    { vesselName: "MV Padma Express", registrationNumber: "M-41762", vesselType: "Launch", owner: owner2._id, route: "Mawa - Kathalbari", capacity: 350, status: "Suspended" }
  ]);

  // ---------- fines ----------
  // [vessel, violationCode, police, issued days ago, status, location, paid days ago, method]
  const plan = [
    [sundarban, "V01", police, 150, "Paid", "Sadarghat Terminal, Dhaka", 140, "bKash"],
    [greenLine, "V02", police2, 120, "Paid", "Barishal Launch Ghat", 100, "Nagad"],
    [karnaphuli, "V09", police, 95, "Paid", "Chattogram Port", 90, "Card"],
    [padma, "V06", police2, 80, "Paid", "Mawa Ghat", 60, "Cash"],
    [sundarban, "V05", police, 55, "Unpaid", "Meghna River, Chandpur"], // overdue
    [padma, "V03", police2, 100, "Unpaid", "Kathalbari Ghat"], // 70 days overdue -> 3 × 5%
    [greenLine, "V07", police, 40, "Cancelled", "Sadarghat Terminal, Dhaka"],
    [karnaphuli, "V08", police2, 30, "Paid", "Karnaphuli River", 20, "bKash"],
    [sundarban, "V02", police, 12, "Unpaid", "Sadarghat Terminal, Dhaka"],
    [greenLine, "V10", police2, 5, "Paid", "Barishal Launch Ghat", 2, "Rocket"],
    [padma, "V04", police, 3, "Unpaid", "Mawa Ghat"],
    [sundarban, "V01", police2, 1, "Unpaid", "Chandpur Launch Ghat"] // repeat offence (V01 was issued before)
  ];

  const year = new Date().getFullYear();
  let seq = 0;

  for (const [vessel, code, byPolice, issuedAgo, status, location, paidAgo, method] of plan) {
    seq += 1;
    const violation = v[code];
    const isRepeat = vessel === sundarban && code === "V01" && issuedAgo === 1;
    const amount = isRepeat ? violation.amount * 2 : violation.amount;

    const fine = await Fine.create({
      fineNumber: `MRN-${year}-${String(seq).padStart(6, "0")}`,
      vessel: vessel._id,
      violation: violation._id,
      violationCode: violation.code,
      violationTitle: violation.title,
      amount,
      isRepeatOffence: isRepeat,
      location,
      issuedBy: byPolice._id,
      issuedAt: daysAgo(issuedAgo),
      dueDate: daysAgo(issuedAgo - 30),
      status,
      ...(status === "Cancelled" && { cancelReason: "Equipment was on board; recorded in error", cancelledBy: admin._id })
    });

    if (status === "Paid") {
      const payment = await Payment.create({
        fine: fine._id,
        paidBy: method === "Cash" ? admin._id : vessel.owner,
        fineAmount: amount,
        lateFee: 0,
        totalAmount: amount,
        method,
        transactionId: `TXNSEED${String(seq).padStart(4, "0")}`,
        paidAt: daysAgo(paidAgo)
      });
      fine.payment = payment._id;
      fine.paidAt = payment.paidAt;
      await fine.save();
    }
  }
  await Counter.findOneAndUpdate({ _id: `fine-${year}` }, { seq }, { upsert: true });

  console.log("\nSeed complete! Demo logins:");
  console.table([
    { role: "admin", email: "admin@marinaut.gov.bd", password: "admin123" },
    { role: "police", email: "police@marinaut.gov.bd", password: "police123" },
    { role: "owner", email: "owner@marinaut.com", password: "owner123" }
  ]);
  return mongoose.disconnect();
};

run().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
