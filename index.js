const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const cloudinary = require("cloudinary");

const connectDB = require("./src/config/db");
const colorRoutes = require("./src/routes/colorRoutes");
const categoryRoutes = require("./src/routes/categoryRoutes");
const plantTypeRoutes = require("./src/routes/plantTypeRoutes");
const productTypeRoutes = require("./src/routes/productTypeRoutes");
const productRoutes = require("./src/routes/productRoutes");
const userRoutes = require("./src/routes/userRoutes");
const orderRoutes = require("./src/routes/orderRoutes");

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// Database Connection
connectDB();

//cloudinary config
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Routes
app.use("/api/colortype", colorRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/planttype", plantTypeRoutes);
app.use("/api/producttype", productTypeRoutes);
app.use("/api/product", productRoutes);
app.use("/api/user", userRoutes);
app.use("/api/order", orderRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
