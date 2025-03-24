const express = require("express");
const router = express.Router();
const Banner = require("../models/bannerModel");
const { singleUpload } = require("../middlewares/multer");
const { getDataUri } = require("../utils/feature");
const cloudinary = require("cloudinary");
const { verifyTokenandAdmin } = require("../middlewares/verifyToken");

// @route   POST /api/banners
// @desc    Add or update a banner by type (main/offer)
// @access  Private (Admin)
router.post("/", verifyTokenandAdmin, singleUpload, async (req, res) => {
  try {
    const { type, description } = req.body;

    if (!["main", "offer"].includes(type)) {
      return res.status(400).json({ error: "Invalid banner type" });
    }

    const file = req.file;
    let imageUrl;

    if (file) {
      const fileUri = getDataUri(file);
      const result = await cloudinary.v2.uploader.upload(fileUri.content);
      imageUrl = result.secure_url;
    }

    // Check if a banner of the same type already exists
    let existingBanner = await Banner.findOne({ type });

    if (existingBanner) {
      // Update existing banner
      if (description) existingBanner.description = description;
      if (imageUrl) existingBanner.imageUrl = imageUrl;

      await existingBanner.save();

      return res.status(200).json({
        message: `Banner of type "${type}" updated successfully`,
        banner: existingBanner,
      });
    }

    // Create new banner
    const newBanner = new Banner({
      type,
      description,
      imageUrl,
    });

    await newBanner.save();

    return res.status(201).json({
      message: `Banner of type "${type}" created successfully`,
      banner: newBanner,
    });
  } catch (error) {
    console.error("Error creating/updating banner:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

// @route   GET /api/banners
// @desc    Get all banners
// @access  Public
router.get("/", async (req, res) => {
  try {
    const banners = await Banner.find();
    res.status(200).json(banners);
  } catch (error) {
    console.error("Error fetching banners:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// @route   GET /api/banners/:id
// @desc    Get a single banner by ID
// @access  Public
router.get("/:id", async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({ error: "Banner not found" });
    }
    res.status(200).json(banner);
  } catch (error) {
    console.error("Error fetching banner:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// @route   PUT /api/banners/:id
// @desc    Update a banner
// @access  Private (Admin)
router.put("/:id", verifyTokenandAdmin, singleUpload, async (req, res) => {
  try {
    const { type, description } = req.body;
    const updateData = { type, description };

    if (req.file) {
      const fileUri = getDataUri(req.file);
      const result = await cloudinary.v2.uploader.upload(fileUri.content);
      updateData.imageUrl = result.secure_url;
    }

    const updatedBanner = await Banner.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!updatedBanner) {
      return res.status(404).json({ error: "Banner not found" });
    }

    res.status(200).json({
      message: "Banner updated successfully",
      banner: updatedBanner,
    });
  } catch (error) {
    console.error("Error updating banner:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

// @route   DELETE /api/banners/:id
// @desc    Delete a banner
// @access  Private (Admin)
router.delete("/:id", verifyTokenandAdmin, async (req, res) => {
  try {
    const deletedBanner = await Banner.findByIdAndDelete(req.params.id);
    if (!deletedBanner) {
      return res.status(404).json({ error: "Banner not found" });
    }
    res.status(200).json({ message: "Banner deleted successfully" });
  } catch (error) {
    console.error("Error deleting banner:", error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
