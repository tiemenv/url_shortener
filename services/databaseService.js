const mongoose = require("mongoose");
require("dotenv").config({ path: "../.env" });

//require mongoose already returns a singleton object so no need to enforce it here
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_DB, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Database Connected");
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
