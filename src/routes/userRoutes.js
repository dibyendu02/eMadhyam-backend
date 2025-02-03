const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const { singleUpload } = require("../middlewares/multer");
const { getDataUri } = require("../utils/feature");
const cloudinary = require("cloudinary");
const {
  verifyToken,
  verifyTokenandAuthorization,
  verifyTokenandAdmin,
} = require("../middlewares/verifyToken");

// Helper function to return safe user data
const getSafeUserData = (user) => ({
  _id: user._id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  phoneNumber: user.phoneNumber,
  imageUrl: user.imageUrl,
  dob: user.dob,
  gender: user.gender,
  address: user.address,
  cart: user.cart,
  wishlist: user.wishlist,
  isAdmin: user.isAdmin,
});

// @route   POST /api/users/register
// @desc    Register a new user
// @access  Public
router.post("/register", singleUpload, async (req, res) => {
  try {
    const { email, password, firstName, lastName, phoneNumber } = req.body;

    // Check for existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Handle image upload
    let imageUrl = "";
    if (req.file) {
      const fileUri = getDataUri(req.file); // Convert file buffer to data URI
      const result = await cloudinary.uploader.upload(fileUri.content); // Upload to Cloudinary
      imageUrl = result.secure_url; // Store Cloudinary URL
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const user = new User({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      phoneNumber,
      imageUrl,
      isAdmin: false,
    });

    await user.save();

    // Create JWT token
    const token = jwt.sign(
      {
        id: user._id,
        isAdmin: user.isAdmin,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      token,
      user: getSafeUserData(user),
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// @route   POST /api/users/login
// @desc    Login user
// @access  Public
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Create JWT token
    const token = jwt.sign(
      {
        id: user._id,
        isAdmin: user.isAdmin,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: getSafeUserData(user),
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// @route   PUT /api/users/change-password/:id
// @desc    Change user password
// @access  Private
router.put(
  "/change-password/:id",
  verifyTokenandAuthorization,
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      // Get user
      const user = await User.findById(req.params.id);

      // Validate current password
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      // Update password
      user.password = hashedPassword;
      await user.save();

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Password change error:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// @route   PUT /api/users/profile/:id
// @desc    Update user profile
// @access  Private
router.put(
  "/profile/:id",
  verifyTokenandAuthorization,
  singleUpload,
  async (req, res) => {
    try {
      const { firstName, lastName, phoneNumber, dob, gender, address } =
        req.body;

      // Get user
      let user = await User.findById(req.params.id);

      // Handle image upload
      if (req.file) {
        const fileUri = getDataUri(req.file);
        const result = await cloudinary.v2.uploader.upload(fileUri.content);
        user.imageUrl = result.secure_url;
      }

      // Update fields
      if (firstName) user.firstName = firstName;
      if (lastName) user.lastName = lastName;
      if (phoneNumber) user.phoneNumber = phoneNumber;
      if (dob) user.dob = new Date(dob);
      if (gender) user.gender = gender;
      if (address) user.address = JSON.parse(address);

      await user.save();

      res.json({
        message: "Profile updated successfully",
        user: getSafeUserData(user),
      });
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// @route   DELETE /api/users/:id
// @desc    Delete user account
// @access  Private
router.delete("/:id", verifyTokenandAuthorization, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User account deleted successfully" });
  } catch (error) {
    console.error("Account deletion error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// @route   GET /api/users/profile/:id
// @desc    Get user profile
// @access  Private
router.get("/profile/:id", verifyTokenandAuthorization, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate("cart")
      .populate("wishlist");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(getSafeUserData(user));
  } catch (error) {
    console.error("Profile fetch error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// @route   GET /api/users
// @desc    Get all user profile
// @access  Private
router.get("/", verifyTokenandAdmin, async (req, res) => {
  try {
    // users which are not admin
    const users = await User.find({ isAdmin: false })
      .populate("cart")
      .populate("wishlist");
    res.json(users);
  } catch (error) {
    console.error("Profile fetch error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
