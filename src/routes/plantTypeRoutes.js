const express = require("express");
const router = express.Router();
const PlantType = require("../models/plantTypeModel");

// @route   POST /planttype
// @desc    Create a new PlantType
router.post("/", async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name field is required" });
    }

    const newPlantType = new PlantType({ name });
    await newPlantType.save();

    res.status(201).json(newPlantType);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// @route   GET /planttype
// @desc    Get all PlantTypes
router.get("/", async (req, res) => {
  try {
    const plantTypes = await PlantType.find();
    res.status(200).json(plantTypes);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// @route   DELETE /planttype/:id
// @desc    Delete a PlantType by ID
router.delete("/:id", async (req, res) => {
  try {
    const plantType = await PlantType.findById(req.params.id);

    if (!plantType) {
      return res.status(404).json({ error: "PlantType not found" });
    }

    await PlantType.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "PlantType deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
