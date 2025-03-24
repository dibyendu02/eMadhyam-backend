const mongoose = require("mongoose");

const { Schema } = mongoose;

const bannerSchema = new Schema({
  type: { type: String, required: true, enum: ["main", "offer"], unique: true },
  description: { type: String, required: true },
  imageUrl: { type: String, required: true },
});

module.exports = mongoose.model("Banner", bannerSchema);
