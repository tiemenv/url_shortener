const serverless = require("serverless-http");
const express = require("express");
const app = express();
const connectDB = require("./services/databaseService");
require("dotenv").config({ path: "./.env" });

connectDB();

// Body Parser
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use("/", require("./routes/index"));
// classic node app
// const port = 3000;
// app.listen(port, () => {
//   console.log(`Server is running at port ${port}`);
// });

//serverless
module.exports.handler = serverless(app);
