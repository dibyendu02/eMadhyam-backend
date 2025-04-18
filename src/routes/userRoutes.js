const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const { singleUpload } = require("../middlewares/multer");
const { getDataUri } = require("../utils/feature");
const cloudinary = require("cloudinary");
const mongoose = require("mongoose");
const {
  verifyToken,
  verifyTokenandAuthorization,
  verifyTokenandAdmin,
} = require("../middlewares/verifyToken");

// // Helper function to return safe user data
// const getSafeUserData = (user) => {
//   // Get a plain JavaScript object
//   const userObj = user.toObject ? user.toObject() : user;

//   // Modify cart structure to maintain compatibility with frontend
//   if (userObj.cart && Array.isArray(userObj.cart)) {
//     // Check if this is the new structure with product/quantity objects
//     if (userObj.cart.length > 0 && userObj.cart[0].product) {
//       // Convert cart items to a flat array of products, duplicating for quantity
//       const flattenedCart = [];
//       userObj.cart.forEach((item) => {
//         if (item.product && item.quantity) {
//           // For each item in cart, add 'quantity' number of occurrences of the product
//           for (let i = 0; i < item.quantity; i++) {
//             flattenedCart.push(item.product);
//           }
//         }
//       });
//       userObj.cart = flattenedCart;
//     }
//   }

//   return {
//     _id: userObj._id,
//     firstName: userObj.firstName,
//     lastName: userObj.lastName,
//     email: userObj.email,
//     phoneNumber: userObj.phoneNumber,
//     imageUrl: userObj.imageUrl,
//     dob: userObj.dob,
//     gender: userObj.gender,
//     address: userObj.address,
//     cart: userObj.cart, // This is now the flattened cart
//     wishlist: userObj.wishlist,
//     isAdmin: userObj.isAdmin,
//   };
// };
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

    // Check for existing phone number
    const existingPhoneUser = await User.findOne({ phoneNumber });
    if (existingPhoneUser) {
      return res.status(400).json({ error: "Phone number already registered" });
    }

    // If email is provided, check if already exists
    if (email) {
      const existingEmailUser = await User.findOne({ email });
      if (existingEmailUser) {
        return res.status(400).json({ error: "Email already registered" });
      }
    }

    // Handle image upload
    let imageUrl = "";
    if (req.file) {
      const fileUri = getDataUri(req.file);
      const result = await cloudinary.uploader.upload(fileUri.content);
      imageUrl = result.secure_url;
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

    const token = jwt.sign(
      { id: user._id, isAdmin: user.isAdmin },
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
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res
        .status(400)
        .json({ error: "Identifier and password are required" });
    }

    // Determine if identifier is email or phone number
    const isEmail = identifier.includes("@");

    const user = await User.findOne(
      isEmail ? { email: identifier } : { phoneNumber: identifier }
    );

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, isAdmin: user.isAdmin },
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
      .populate({
        path: "cart.product", // Populate product inside cart items
        model: "Product",
      })
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

// @route   POST /api/users/cart/:id
// @desc    Add product to cart
// @access  Private
router.post("/cart/:id", verifyTokenandAuthorization, async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ error: "Product ID is required" });
    }

    // Get user
    const user = await User.findById(req.params.id);

    // Check if product already in cart
    // Handle both old and new cart structure
    let isInCart = false;

    if (Array.isArray(user.cart)) {
      // Check if it's a simple array of product IDs (old structure)
      if (
        (user.cart.length > 0 && typeof user.cart[0] === "string") ||
        user.cart[0] instanceof mongoose.Types.ObjectId
      ) {
        isInCart = user.cart.some((id) => id.toString() === productId);

        if (!isInCart) {
          // Add to cart (old structure)
          user.cart.push(productId);
        }
      }
      // Check if it's an array of objects with product and quantity (new structure)
      else if (user.cart.length > 0 && user.cart[0].product) {
        const existingCartItem = user.cart.find(
          (item) => item.product && item.product.toString() === productId
        );

        if (existingCartItem) {
          // Increment quantity
          existingCartItem.quantity += 1;
          isInCart = true;
        } else {
          // Add new item
          user.cart.push({ product: productId, quantity: 1 });
        }
      }
      // Empty cart or undefined structure - add as new item with new structure
      else {
        user.cart = [{ product: productId, quantity: 1 }];
      }
    } else {
      // Initialize cart if it doesn't exist
      user.cart = [{ product: productId, quantity: 1 }];
    }

    await user.save();

    // Get updated user with populated cart
    const updatedUser = await User.findById(req.params.id)
      .populate({
        path: "cart.product", // For new structure
        model: "Product",
      })
      .populate("cart") // For old structure
      .populate("wishlist");

    res.json({
      message: "Product added to cart successfully",
      user: getSafeUserData(updatedUser),
    });
  } catch (error) {
    console.error("Add to cart error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// @route   DELETE /api/users/cart/:id
// @desc    Remove product from cart
// @access  Private
router.delete("/cart/:id", verifyTokenandAuthorization, async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ error: "Product ID is required" });
    }

    // Get user
    const user = await User.findById(req.params.id);

    // Handle both old and new cart structure
    if (Array.isArray(user.cart)) {
      // Check if it's a simple array of product IDs (old structure)
      if (
        user.cart.length > 0 &&
        (typeof user.cart[0] === "string" ||
          user.cart[0] instanceof mongoose.Types.ObjectId)
      ) {
        // Remove from cart (old structure)
        user.cart = user.cart.filter((id) => id && id.toString() !== productId);
      }
      // Check if it's an array of objects with product and quantity (new structure)
      else if (user.cart.length > 0 && user.cart[0].product) {
        const cartItemIndex = user.cart.findIndex(
          (item) => item.product && item.product.toString() === productId
        );

        if (cartItemIndex !== -1) {
          const cartItem = user.cart[cartItemIndex];

          if (cartItem.quantity > 1) {
            // If quantity > 1, decrement quantity
            cartItem.quantity -= 1;
          } else {
            // If quantity = 1, remove the item
            user.cart.splice(cartItemIndex, 1);
          }
        }
      }
    }

    await user.save();

    // Get updated user with populated cart
    const updatedUser = await User.findById(req.params.id)
      .populate({
        path: "cart.product", // For new structure
        model: "Product",
      })
      .populate("cart") // For old structure
      .populate("wishlist");

    res.json({
      message: "Product removed from cart successfully",
      user: getSafeUserData(updatedUser),
    });
  } catch (error) {
    console.error("Remove from cart error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// @route   POST /api/users/wishlist/:id
// @desc    Add product to wishlist
// @access  Private
router.post("/wishlist/:id", verifyTokenandAuthorization, async (req, res) => {
  try {
    const { productId } = req.body;

    // Get user
    const user = await User.findById(req.params.id);

    // Check if product already in wishlist
    if (user.wishlist.includes(productId)) {
      return res.status(400).json({ error: "Product already in wishlist" });
    }

    // Add to wishlist
    user.wishlist.push(productId);
    await user.save();

    // Get updated user with populated wishlist
    const updatedUser = await User.findById(req.params.id)
      .populate("cart")
      .populate("wishlist");

    res.json({
      message: "Product added to wishlist successfully",
      user: getSafeUserData(updatedUser),
    });
  } catch (error) {
    console.error("Add to wishlist error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// @route   DELETE /api/users/wishlist/:id
// @desc    Remove product from wishlist
// @access  Private
router.delete(
  "/wishlist/:id",
  verifyTokenandAuthorization,
  async (req, res) => {
    try {
      const { productId } = req.body;

      // Get user
      const user = await User.findById(req.params.id);

      // Remove from wishlist
      user.wishlist = user.wishlist.filter((id) => id.toString() !== productId);
      await user.save();

      // Get updated user with populated wishlist
      const updatedUser = await User.findById(req.params.id)
        .populate("cart")
        .populate("wishlist");

      res.json({
        message: "Product removed from wishlist successfully",
        user: getSafeUserData(updatedUser),
      });
    } catch (error) {
      console.error("Remove from wishlist error:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
);

module.exports = router;
