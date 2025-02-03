const mongoose = require("mongoose");

const { Schema } = mongoose;
const ProductSchema = new Schema(
  {
    name: { type: String, required: true },
    imageUrls: { type: [String], required: true },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    season: { type: String, default: "All" },
    color: { type: Schema.Types.ObjectId, ref: "ColorType", required: true },
    shortDescription: { type: String },
    description: { type: String },
    rating: { type: Number },
    price: { type: Number, required: true },
    originalPrice: { type: Number },
    discountPercentage: { type: Number },
    sizeRanges: { type: [String] },
    inStock: { type: Boolean, default: true },
    reviews: { type: Number },
    productType: {
      type: Schema.Types.ObjectId,
      ref: "ProductType",
    },
    plantType: {
      type: Schema.Types.ObjectId,
      ref: "PlantType",
    },
    isBestseller: { type: Boolean },
    isTrending: { type: Boolean },

    // aditional fields
    weight: { type: String },
    dimensions: { type: String },
    waterRequirement: { type: String },
    sunlightRequirement: { type: String },
    faqs: [
      {
        question: { type: String },
        answer: { type: String },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", ProductSchema);
