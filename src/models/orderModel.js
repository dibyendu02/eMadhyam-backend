const mongoose = require("mongoose");

const { Schema } = mongoose;
const OrderSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  products: [{ type: Schema.Types.ObjectId, ref: "Product" }],
  time: { type: Date, default: Date.now },
  isPaid: { type: Boolean, default: false },
  paymentMethod: { type: String },
  status: {
    type: String,
    enum: ["pending", "processing", "delivered", "cancelled"],
    default: "pending",
  },
  deliveryDate: { type: Date },
});

module.exports = mongoose.model("Order", OrderSchema);
