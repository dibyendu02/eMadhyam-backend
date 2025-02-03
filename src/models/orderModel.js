const mongoose = require("mongoose");

const { Schema } = mongoose;
const OrderSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  products: [{ type: Schema.Types.ObjectId, ref: "Product" }],
  time: { type: Date, default: Date.now },
  isPaid: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ["pending", "processing", "delivered", "cancelled"],
    default: "pending",
  },
});

module.exports = mongoose.model("Order", OrderSchema);
