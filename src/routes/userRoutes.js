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
      console.log("update profile api call");
      console.log(req.body["address[0]"]);

      const { firstName, lastName, phoneNumber, dob, gender } = req.body;

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

      // Handle address update (assuming it's sent as an array of objects)
      if (req.body["address[0].addressLine"]) {
        // Construct the address array based on the form-data
        const address = [
          {
            addressLine: req.body["address[1].addressLine"],
            city: req.body["address[0].city"],
            state: req.body["address[0].state"],
            pinCode: req.body["address[0].pinCode"],
            alternativeAddress: req.body["address[0].alternativeAddress"],
            alternativeContact: req.body["address[0].alternativeContact"],
          },
        ];
        user.address = address;
      }

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

// @route   POST /api/users/address/:id
// @desc    Add a new address for a user
// @access  Private
router.post("/address/:id", verifyTokenandAuthorization, async (req, res) => {
  try {
    const {
      addressLine,
      city,
      state,
      pinCode,
      alternativeAddress,
      alternativeContact,
    } = req.body;

    console.log(req.body);

    // Validate required fields
    if (!addressLine || !city || !state || !pinCode) {
      return res
        .status(400)
        .json({ error: "Please provide all required address fields" });
    }

    // Get user
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Create new address
    const newAddress = {
      addressLine,
      city,
      state,
      pinCode,
      alternativeAddress,
      alternativeContact,
    };

    // Add address to user's address array
    user.address.push(newAddress);
    await user.save();

    res.status(201).json({
      message: "Address added successfully",
      address: user.address[user.address.length - 1],
      addresses: user.address,
    });
  } catch (error) {
    console.error("Address addition error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// @route   GET /api/users/address/:id
// @desc    Get all addresses for a user
// @access  Private
router.get("/address/:id", verifyTokenandAuthorization, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user.address);
  } catch (error) {
    console.error("Address fetch error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// @route   PUT /api/users/address/:id/:addressId
// @desc    Update an address for a user
// @access  Private
router.put(
  "/address/:id/:addressId",
  verifyTokenandAuthorization,
  async (req, res) => {
    try {
      const {
        addressLine,
        city,
        state,
        pinCode,
        alternativeAddress,
        alternativeContact,
      } = req.body;

      // Get user
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Find the address in the user's address array
      const addressIndex = user.address.findIndex(
        (addr) => addr._id.toString() === req.params.addressId
      );

      if (addressIndex === -1) {
        return res.status(404).json({ error: "Address not found" });
      }

      // Update address fields if provided
      if (addressLine) user.address[addressIndex].addressLine = addressLine;
      if (city) user.address[addressIndex].city = city;
      if (state) user.address[addressIndex].state = state;
      if (pinCode) user.address[addressIndex].pinCode = pinCode;

      // These are optional fields, so we need to check if they're included, not just truthy
      if (req.body.hasOwnProperty("alternativeAddress")) {
        user.address[addressIndex].alternativeAddress = alternativeAddress;
      }
      if (req.body.hasOwnProperty("alternativeContact")) {
        user.address[addressIndex].alternativeContact = alternativeContact;
      }

      await user.save();

      res.json({
        message: "Address updated successfully",
        address: user.address[addressIndex],
        addresses: user.address,
      });
    } catch (error) {
      console.error("Address update error:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// @route   DELETE /api/users/address/:id/:addressId
// @desc    Delete an address for a user
// @access  Private
router.delete(
  "/address/:id/:addressId",
  verifyTokenandAuthorization,
  async (req, res) => {
    try {
      // Get user
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Find the address index
      const addressIndex = user.address.findIndex(
        (addr) => addr._id.toString() === req.params.addressId
      );

      if (addressIndex === -1) {
        return res.status(404).json({ error: "Address not found" });
      }

      // Remove the address from the array
      user.address.splice(addressIndex, 1);
      await user.save();

      res.json({
        message: "Address deleted successfully",
        addresses: user.address,
      });
    } catch (error) {
      console.error("Address deletion error:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// @route   POST /api/users/address/default/:id/:addressId
// @desc    Set an address as default (moves it to first position in array)
// @access  Private
router.post(
  "/address/default/:id/:addressId",
  verifyTokenandAuthorization,
  async (req, res) => {
    try {
      // Get user
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Find the address
      const addressIndex = user.address.findIndex(
        (addr) => addr._id.toString() === req.params.addressId
      );

      if (addressIndex === -1) {
        return res.status(404).json({ error: "Address not found" });
      }

      // If it's already at position 0, no need to do anything
      if (addressIndex === 0) {
        return res.json({
          message: "This address is already set as default",
          addresses: user.address,
        });
      }

      // Remove the address from its current position
      const addressToMove = user.address.splice(addressIndex, 1)[0];

      // Add it to the beginning of the array
      user.address.unshift(addressToMove);

      await user.save();

      res.json({
        message: "Address set as default successfully",
        addresses: user.address,
      });
    } catch (error) {
      console.error("Set default address error:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
);

module.exports = router;
