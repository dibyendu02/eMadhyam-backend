const express = require("express");
const router = express.Router();
const ColorType = require("../models/colorModel");

// @route   POST /colortype
// @desc    Create a new ColorType
// @access  Public or Private (Adjust as needed)
router.post("/", async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name field is required" });
    }

    const newColorType = new ColorType({ name });
    await newColorType.save();

    res.status(201).json(newColorType);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// @route   GET /colortype
// @desc    Get all ColorTypes
// @access  Public
router.get("/", async (req, res) => {
  try {
    const colorTypes = await ColorType.find();
    res.status(200).json(colorTypes);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// @route   DELETE /colortype/:id
// @desc    Delete a ColorType by ID
// @access  Public or Private (Adjust as needed)
router.delete("/:id", async (req, res) => {
  try {
    const colorType = await ColorType.findById(req.params.id);

    if (!colorType) {
      return res.status(404).json({ error: "Color not found" });
    }

    await ColorType.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Color deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
