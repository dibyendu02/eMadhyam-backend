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

const UserSchema = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String },
    email: { type: String, required: true, unique: true },
    isEmailVerified: { type: Boolean, default: false },
    phoneNumber: { type: String, required: true },
    password: { type: String, required: true },
    cart: [{ type: Schema.Types.ObjectId, ref: "Product" }],
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
