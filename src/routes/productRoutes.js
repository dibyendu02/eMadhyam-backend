const express = require("express");
const router = express.Router();
const Product = require("../models/productModel");
const { singleUpload, multipleUpload } = require("../middlewares/multer");
const { getDataUri } = require("../utils/feature");
const cloudinary = require("cloudinary");
const { verifyTokenandAdmin } = require("../middlewares/verifyToken");
const sanitizeHtml = require("sanitize-html");

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

// Helper function to handle ObjectId references
const handleObjectIdField = (value) => {
  // If value is null, undefined, or empty string, return null (remove the field)
  if (value === undefined || value === null || value === "") {
    return null;
  }
  return value;
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
      isCodAvailable,
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

    // Create product object with only required and provided fields
    const productData = {
      name,
      imageUrls,
      category,
      description: sanitizedDescription,
      price,
      inStock: inStock !== undefined ? inStock : true,
      isCodAvailable: isCodAvailable !== undefined ? isCodAvailable : true,
    };

    // Add optional fields only if they are provided
    if (season) productData.season = season;

    // Handle ObjectId references safely
    const safeColor = handleObjectIdField(color);
    if (safeColor !== null) productData.color = safeColor;

    if (shortDescription) productData.shortDescription = shortDescription;
    if (originalPrice) productData.originalPrice = originalPrice;
    if (discountPercentage) productData.discountPercentage = discountPercentage;
    if (sizeRanges) productData.sizeRanges = sizeRanges;

    // Handle ObjectId references safely
    const safeProductType = handleObjectIdField(productType);
    if (safeProductType !== null) productData.productType = safeProductType;

    const safePlantType = handleObjectIdField(plantType);
    if (safePlantType !== null) productData.plantType = safePlantType;

    if (isBestseller !== undefined) productData.isBestseller = isBestseller;
    if (isTrending !== undefined) productData.isTrending = isTrending;
    if (weight) productData.weight = weight;
    if (dimensions) productData.dimensions = dimensions;
    if (waterRequirement) productData.waterRequirement = waterRequirement;
    if (sunlightRequirement)
      productData.sunlightRequirement = sunlightRequirement;
    if (faqs) productData.faqs = JSON.parse(faqs);

    const newProduct = new Product(productData);
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

// @route   GET /api/products/type/:productTypeId
// @desc    Get all products by product type
// @access  Public
router.get("/type/:productTypeId", async (req, res) => {
  try {
    const products = await Product.find({
      productType: req.params.productTypeId,
    }).populate("category productType plantType color");

    res.status(200).json(products);
  } catch (error) {
    console.error("Error fetching products by product type:", error);
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
      isCodAvailable,
      existingImages, // Changed from existingImageUrls for clarity
    } = req.body;

    let product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });

    // Sanitize HTML content in description
    const sanitizedDescription = description
      ? sanitizeHtml(description, sanitizeOptions)
      : product.description;

    // Handle image URLs - use the provided list of existing images if available
    let imageUrls = [];

    // Parse the existingImages JSON string if it exists
    if (existingImages) {
      try {
        imageUrls = JSON.parse(existingImages);
      } catch (error) {
        console.error("Error parsing existingImages:", error);
        // If parsing fails, use the current images as fallback
        imageUrls = product.imageUrls || [];
      }
    } else {
      // If no existingImages provided, keep current images
      imageUrls = product.imageUrls || [];
    }

    // Add any new uploaded images
    if (req.files && req.files.length > 0) {
      for (let file of req.files) {
        const fileUri = getDataUri(file);
        const result = await cloudinary.v2.uploader.upload(fileUri.content);
        imageUrls.push(result.secure_url);
      }
    }

    // Create update object with only fields that are provided
    const updateData = {};

    if (name) updateData.name = name;
    updateData.imageUrls = imageUrls; // Always update the image URLs
    if (category) updateData.category = category;
    if (season) updateData.season = season;

    // Handle ObjectId references properly for update
    if (color !== undefined) {
      const safeColor = handleObjectIdField(color);
      if (safeColor === null) {
        // If null, use $unset to remove the field
        updateData.$unset = { ...updateData.$unset, color: 1 };
      } else {
        updateData.color = safeColor;
      }
    }

    if (shortDescription !== undefined)
      updateData.shortDescription = shortDescription;
    if (sanitizedDescription) updateData.description = sanitizedDescription;
    if (price) updateData.price = price;
    if (originalPrice !== undefined) updateData.originalPrice = originalPrice;
    if (discountPercentage !== undefined)
      updateData.discountPercentage = discountPercentage;
    if (sizeRanges) updateData.sizeRanges = sizeRanges;
    if (inStock !== undefined) updateData.inStock = inStock;

    // Handle ObjectId references properly for update
    if (productType !== undefined) {
      const safeProductType = handleObjectIdField(productType);
      if (safeProductType === null) {
        updateData.$unset = { ...updateData.$unset, productType: 1 };
      } else {
        updateData.productType = safeProductType;
      }
    }

    if (plantType !== undefined) {
      const safePlantType = handleObjectIdField(plantType);
      if (safePlantType === null) {
        updateData.$unset = { ...updateData.$unset, plantType: 1 };
      } else {
        updateData.plantType = safePlantType;
      }
    }

    if (isBestseller !== undefined) updateData.isBestseller = isBestseller;
    if (isTrending !== undefined) updateData.isTrending = isTrending;
    if (weight !== undefined) updateData.weight = weight;
    if (dimensions !== undefined) updateData.dimensions = dimensions;
    if (waterRequirement !== undefined)
      updateData.waterRequirement = waterRequirement;
    if (sunlightRequirement !== undefined)
      updateData.sunlightRequirement = sunlightRequirement;
    if (faqs) updateData.faqs = JSON.parse(faqs);
    if (isCodAvailable !== undefined)
      updateData.isCodAvailable = isCodAvailable;

    // Use a different approach for update to handle $unset operations
    const updateOptions = { new: true };

    if (updateData.$unset) {
      // If we have fields to unset, handle them separately
      const fieldsToSet = { ...updateData };
      delete fieldsToSet.$unset;

      // First update the fields to set
      product = await Product.findByIdAndUpdate(
        req.params.id,
        { $set: fieldsToSet },
        updateOptions
      );

      // Then unset the fields that need to be removed
      product = await Product.findByIdAndUpdate(
        req.params.id,
        { $unset: updateData.$unset },
        updateOptions
      );
    } else {
      // No fields to unset, just update normally
      product = await Product.findByIdAndUpdate(
        req.params.id,
        { $set: updateData },
        updateOptions
      );
    }

    // Populate the references before returning
    await product.populate("category productType plantType color");

    res.status(200).json({ message: "Product updated successfully", product });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ error: "Server error", details: error.message });
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
