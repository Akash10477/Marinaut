const app = require("../app");
const connectDB = require("../config/db");

let dbPromise;

module.exports = async (req, res) => {
  if (!dbPromise) {
    dbPromise = connectDB();
  }

  await dbPromise;
  return app(req, res);
};