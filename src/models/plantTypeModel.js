const mongoose = require("mongoose");

const { Schema } = mongoose;
const PlantTypeSchema = new Schema({
  name: { type: String, required: true },
});

module.exports = mongoose.model("PlantType", PlantTypeSchema);
