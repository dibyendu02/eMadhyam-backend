const mongoose = require("mongoose");

const { Schema } = mongoose;

const OrderAddressSchema = new Schema({
  addressLine: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  pinCode: { type: Number, required: true },
  alternativeAddress: String,
  alternativeContact: String,
});

const OrderSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  products: [{ type: Schema.Types.ObjectId, ref: "Product", required: true }],
  time: { type: Date, default: Date.now },
  isPaid: { type: Boolean, default: false },
  paymentMethod: { type: String, enum: ["cod", "online"], default: "cod" },
  status: {
    type: String,
    enum: ["pending", "processing", "delivered", "cancelled"],
    default: "pending",
  },
  deliveryDate: { type: Date },
  razorpayOrder: {
    id: String,
    amount: Number,
    currency: String,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  deliveryAddress: {
    type: OrderAddressSchema,
    required: true,
  },
});

module.exports = mongoose.model("Order", OrderSchema);
