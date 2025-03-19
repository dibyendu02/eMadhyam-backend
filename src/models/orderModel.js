const mongoose = require("mongoose");

const { Schema } = mongoose;

// Copy of Address Schema from User model for embedding in orders
const AddressSchema = new Schema({
  addressLine: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  pinCode: { type: Number, required: true },
  alternativeAddress: { type: String },
  alternativeContact: { type: String },
});

const OrderSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  products: [
    {
      productId: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
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
    enum: ["pending", "processing", "delivered", "cancelled", "shipped"],
    default: "pending",
  },
  deliveryDate: { type: Date },
  // Add delivery address - store the complete address
  deliveryAddress: { type: AddressSchema, required: true },
  // Store address ID from user profile for reference
  addressId: { type: Schema.Types.ObjectId },
  // Add Razorpay payment details
  razorpayOrder: {
    id: { type: String },
    amount: { type: Number },
    currency: { type: String },
  },
  razorpayPaymentId: { type: String },
  razorpaySignature: { type: String },
});

module.exports = mongoose.model("Order", OrderSchema);
