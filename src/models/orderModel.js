const mongoose = require("mongoose");

const { Schema } = mongoose;
const OrderSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  products: [
    {
      productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
      quantity: { type: Number, required: true, min: 1 },
    },
  ],
  time: { type: Date, default: Date.now },
  isPaid: { type: Boolean, default: false },
  paymentMethod: { type: String },
  paymentInfo: {
    billingAmount: { type: Number, required: true },
    totalSaved: { type: Number, required: true },
  },
  status: {
    type: String,
    enum: ["pending", "processing", "delivered", "cancelled"],
    default: "pending",
  },
  deliveryDate: { type: Date },
});

module.exports = mongoose.model("Order", OrderSchema);
