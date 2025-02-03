const mongoose = require("mongoose");

const { Schema } = mongoose;
const ProductTypeSchema = new Schema({
  name: { type: String, required: true },
});

module.exports = mongoose.model("ProductType", ProductTypeSchema);
