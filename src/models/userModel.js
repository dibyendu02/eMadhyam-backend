const mongoose = require("mongoose");

const { Schema } = mongoose;

const AddressSchema = new Schema({
  addressLine: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  pinCode: { type: Number, required: true },
  alternativeAddress: { type: String },
  alternativeContact: { type: String },
});

// New schema for cart items with quantity
const CartItemSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  quantity: { type: Number, required: true, default: 1, min: 1 },
});

const UserSchema = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String },
    email: { type: String, unique: true, sparse: true },
    isEmailVerified: { type: Boolean, default: false },
    phoneNumber: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    cart: [CartItemSchema], // Changed to use CartItemSchema
    wishlist: [{ type: Schema.Types.ObjectId, ref: "Product" }],
    imageUrl: { type: String },
    dob: { type: Date },
    gender: { type: String },
    address: [AddressSchema],
    isAdmin: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
