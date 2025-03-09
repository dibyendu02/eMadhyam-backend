const express = require("express");
const router = express.Router();
const Product = require("../models/productModel");
const { singleUpload, multipleUpload } = require("../middlewares/multer");
const { getDataUri } = require("../utils/feature");
const cloudinary = require("cloudinary");
const { verifyTokenandAdmin } = require("../middlewares/verifyToken");
const sanitizeHtml = require("sanitize-html"); // Add this import

// Define sanitize options for HTML content
const sanitizeOptions = {
  allowedTags: [
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "blockquote",
    "p",
    "a",
    "ul",
    "ol",
    "nl",
    "li",
    "b",
    "i",
    "strong",
    "em",
    "strike",
    "code",
    "hr",
    "br",
    "div",
    "table",
    "thead",
    "caption",
    "tbody",
    "tr",
    "th",
    "td",
    "pre",
    "span",
  ],
  allowedAttributes: {
    a: ["href", "name", "target"],
    img: ["src", "alt"],
    "*": ["class", "style"],
  },
  allowedStyles: {
    "*": {
      color: [
        /^#(0x)?[0-9a-f]+$/i,
        /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/,
      ],
      "text-align": [/^left$/, /^right$/, /^center$/],
      "font-weight": [/^\d+$/],
    },
  },
};

// @route   POST /api/products
// @desc    Create a new product
// @access  Private
router.post("/", verifyTokenandAdmin, multipleUpload, async (req, res) => {
  try {
    const {
      name,
      category,
      season,
      color,
      shortDescription,
      description,
      price,
      originalPrice,
      discountPercentage,
      sizeRanges,
      inStock,
      productType,
      plantType,
      isBestseller,
      isTrending,
      weight,
      dimensions,
      waterRequirement,
      sunlightRequirement,
      faqs,
    } = req.body;

    console.log(req.body);

    // Sanitize HTML content in description
    const sanitizedDescription = description
      ? sanitizeHtml(description, sanitizeOptions)
      : "";

    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      for (let file of req.files) {
        const fileUri = getDataUri(file);
        const result = await cloudinary.v2.uploader.upload(fileUri.content);
        imageUrls.push(result.secure_url);
      }
    }

    const newProduct = new Product({
      name,
      imageUrls,
      category,
      season,
      color,
      shortDescription,
      description: sanitizedDescription, // Use sanitized description
      price,
      originalPrice,
      discountPercentage,
      sizeRanges,
      inStock,
      productType,
      plantType,
      isBestseller,
      isTrending,
      weight,
      dimensions,
      waterRequirement,
      sunlightRequirement,
      faqs: faqs ? JSON.parse(faqs) : [],
    });

    await newProduct.save();

    // Populate the new product before sending the response
    const populatedProduct = await Product.findById(newProduct._id)
      .populate("category")
      .populate("productType")
      .populate("plantType")
      .populate("color");

    res.status(201).json({
      message: "Product added successfully",
      product: populatedProduct,
    });
  } catch (error) {
    console.error("Error details:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

// @route   GET /api/products
// @desc    Get all products
// @access  Public
router.get("/", async (req, res) => {
  try {
    const products = await Product.find().populate(
      "category productType plantType color"
    );
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// @route   GET /api/products/:id
// @desc    Get product by ID
// @access  Public
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate(
      "category productType plantType color"
    );
    if (!product) return res.status(404).json({ error: "Product not found" });

    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// @route   GET /api/products/category/:categoryId
// @desc    Get all products by category
// @access  Public
router.get("/category/:categoryId", async (req, res) => {
  try {
    const products = await Product.find({
      category: req.params.categoryId,
    }).populate("category productType plantType color");
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// @route   PUT /api/products/:id
// @desc    Update product
// @access  Private
router.put("/:id", multipleUpload, verifyTokenandAdmin, async (req, res) => {
  try {
    const {
      name,
      category,
      season,
      color,
      shortDescription,
      description,
      price,
      originalPrice,
      discountPercentage,
      sizeRanges,
      inStock,
      productType,
      plantType,
      isBestseller,
      isTrending,
      weight,
      dimensions,
      waterRequirement,
      sunlightRequirement,
      faqs,
    } = req.body;

    let product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });

    // Sanitize HTML content in description
    const sanitizedDescription = description
      ? sanitizeHtml(description, sanitizeOptions)
      : product.description;

    let imageUrls = product.imageUrls;
    if (req.files && req.files.files) {
      for (let file of req.files.files) {
        const fileUri = getDataUri(file).content;
        const result = await cloudinary.uploader.upload(fileUri);
        imageUrls.push(result.secure_url);
      }
    }

    product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        name,
        imageUrls,
        category,
        season,
        color,
        shortDescription,
        description: sanitizedDescription, // Use sanitized description
        price,
        originalPrice,
        discountPercentage,
        sizeRanges,
        inStock,
        productType,
        plantType,
        isBestseller,
        isTrending,
        weight,
        dimensions,
        waterRequirement,
        sunlightRequirement,
        faqs: faqs ? JSON.parse(faqs) : [],
      },
      { new: true }
    );

    res.status(200).json({ message: "Product updated successfully", product });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// @route   DELETE /api/products/:id
// @desc    Delete a product
// @access  Private
router.delete("/:id", verifyTokenandAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });

    await Product.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
