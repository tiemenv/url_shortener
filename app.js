const Express = require("Express");
const app = Express();
const connectDB = require("./services/databaseService");
require("dotenv").config({ path: "./.env" });

connectDB();

// Body Parser
app.use(Express.urlencoded({ extended: true }));
app.use(Express.json());

app.use("/", require("./routes/index"));

// Server Setup
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running at PORT ${PORT}`);
});
