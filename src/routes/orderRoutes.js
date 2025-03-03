const express = require("express");
const router = express.Router();
const Order = require("../models/orderModel");
const Product = require("../models/productModel");
const User = require("../models/userModel");
const {
  verifyToken,
  verifyTokenandAuthorization,
  verifyTokenandAdmin,
} = require("../middlewares/verifyToken");
const Razorpay = require("razorpay");
const crypto = require("crypto");

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// @route   POST /api/order
// @desc    Create a new order
router.post("/", verifyToken, async (req, res) => {
  try {
    console.log(req.body);
    const { products, paymentMethod, addressId } = req.body;

    if (!products || products.length === 0) {
      return res.status(400).json({ error: "Products are required" });
    }

    if (!addressId) {
      return res.status(400).json({ error: "Delivery address is required" });
    }

    // Find user and their address
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Find the selected address from user's address array
    const selectedAddress = user.address.id(addressId);
    if (!selectedAddress) {
      return res.status(404).json({ error: "Address not found" });
    }

    // Calculate total amount and total saved
    let totalAmount = 0;
    let totalSaved = 0;
    for (const { productId, quantity } of products) {
      const product = await Product.findById(productId);
      if (!product) {
        return res
          .status(404)
          .json({ error: `Product ${productId} not found` });
      }
      totalAmount += product.price * quantity;
      totalSaved += (product.originalPrice - product.price) * quantity;
    }

    // Create order
    const order = new Order({
      userId: req.user.id,
      products,
      paymentMethod,
      paymentInfo: {
        billingAmount: totalAmount,
        totalSaved,
      },
      status: "pending",
      deliveryAddress: selectedAddress.toObject(),
      addressId: selectedAddress._id,
    });

    if (paymentMethod === "online") {
      // Create Razorpay order
      const razorpayOrder = await razorpay.orders.create({
        amount: Math.round(totalAmount * 100), // Convert to paise
        currency: "INR",
        receipt: order._id.toString(),
      });

      // Save Razorpay order details to our order
      order.razorpayOrder = {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency
      };

      await order.save();

      res.status(201).json({
        message: "Order created successfully",
        order,
        razorpayOrder: {
          id: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
        },
      });
    } else {
      // For COD orders
      await order.save();
      res.status(201).json({
        message: "Order created successfully",
        order,
      });
    }
  } catch (error) {
    console.error("Order creation error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// @route   GET /api/order
// @desc    Get all orders (admin only)
router.get("/", verifyTokenandAdmin, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("userId", "firstName lastName email")
      .populate("products.productId");
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// @route   GET /api/order/:id
// @desc    Get order by ID
router.get("/:id", verifyTokenandAuthorization, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("userId", "firstName lastName email")
      .populate("products.productId");

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Check if user is authorized to view this order
    if (order.userId._id.toString() !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: "Not authorized" });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// @route   GET /api/order/user/:userId
// @desc    Get orders by user ID
router.get("/user/:id", verifyTokenandAuthorization, async (req, res) => {
  try {

    console.log("the userid got in backend" ,req.params.id);
    const orders = await Order.find({ userId: req.params.id })
      .populate("products.productId")
      .sort({ time: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// @route   PUT /api/order/:id
// @desc    Update order status
router.put("/:id", verifyTokenandAdmin, async (req, res) => {
  try {
    const { status, deliveryDate } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        status,
        ...(deliveryDate && { deliveryDate: new Date(deliveryDate) }),
      },
      { new: true }
    ).populate("userId products.productId");

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({
      message: "Order updated successfully",
      order,
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// @route   DELETE /api/order/:id
// @desc    Delete order (admin only)
router.delete("/:id", verifyTokenandAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Only allow deletion of pending orders
    if (order.status !== "pending") {
      return res.status(400).json({ error: "Can only delete pending orders" });
    }

    await Order.findByIdAndDelete(req.params.id);
    res.json({ message: "Order deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// @route   POST /api/order/payment/verify
// @desc    Verify Razorpay payment
router.post("/payment/verify", verifyToken, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

    // Verify the payment signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      // Find the order using the stored Razorpay order ID
      const order = await Order.findOne({
        "razorpayOrder.id": razorpay_order_id
      });
      
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      // Update order with payment details
      order.isPaid = true;
      order.status = "processing";
      order.razorpayPaymentId = razorpay_payment_id;
      order.razorpaySignature = razorpay_signature;
      await order.save();

      res.json({
        message: "Payment verified successfully",
        order,
      });
    } else {
      res.status(400).json({ error: "Invalid signature" });
    }
  } catch (error) {
    console.error("Payment verification error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// @route   POST /api/order/payment/webhook
// @desc    Razorpay webhook handler
router.post("/payment/webhook", async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (signature === expectedSignature) {
      const event = req.body;

      if (event.event === "payment.captured") {
        const paymentEntity = event.payload.payment.entity;
        const order = await Order.findOne({
          "razorpayOrder.id": paymentEntity.order_id
        });

        if (order) {
          order.isPaid = true;
          order.status = "processing";
          order.razorpayPaymentId = paymentEntity.id;
          await order.save();
        }
      }

      res.json({ status: "ok" });
    } else {
      res.status(400).json({ error: "Invalid webhook signature" });
    }
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;