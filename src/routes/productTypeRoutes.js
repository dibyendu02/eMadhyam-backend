const express = require("express");
const router = express.Router();
const ProductType = require("../models/ProductTypeModel");

// @route   POST /producttype
// @desc    Create a new ProductType
router.post("/", async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name field is required" });
    }

    const newProductType = new ProductType({ name });
    await newProductType.save();

    res.status(201).json(newProductType);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// @route   GET /producttype
// @desc    Get all ProductTypes
router.get("/", async (req, res) => {
  try {
    const productTypes = await ProductType.find();
    res.status(200).json(productTypes);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// @route   DELETE /producttype/:id
// @desc    Delete a ProductType by ID
router.delete("/:id", async (req, res) => {
  try {
    const productType = await ProductType.findById(req.params.id);

    if (!productType) {
      return res.status(404).json({ error: "ProductType not found" });
    }

    await ProductType.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "ProductType deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
