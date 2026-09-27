const dotenv = require("dotenv");
dotenv.config({ quiet: true });

// required env check
const missing = ["MONGO_URI", "JWT_SECRET"].filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing env variables: ${missing.join(", ")}`);
  process.exit(1);
}

const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;

// start the server after the DB connects
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
