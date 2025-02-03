const mongoose = require("mongoose");

const { Schema } = mongoose;
const ColorTypeSchema = new Schema({
  name: { type: String, required: true },
});

module.exports = mongoose.model("ColorType", ColorTypeSchema);
