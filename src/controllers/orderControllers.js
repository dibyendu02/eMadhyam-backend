const Order = require("../models/orderModel");
const Product = require("../models/productModel");
const User = require("../models/userModel");
const Razorpay = require("razorpay");
const crypto = require("crypto");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create new order
exports.createOrder = async (req, res) => {
  try {
    const { products, paymentMethod, addressId } = req.body;

    // Validate products
    if (!products?.length) {
      return res.status(400).json({ error: "Products are required" });
    }

    // Get user and validate address
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Find the selected address from user's addresses
    const selectedAddress = user.address.id(addressId);
    if (!selectedAddress) {
      return res
        .status(400)
        .json({ error: "Invalid delivery address selected" });
    }

    // Calculate total amount and validate products
    let totalAmount = 0;
    const validProducts = [];

    for (const productId of products) {
      const product = await Product.findById(productId);
      if (!product) {
        return res
          .status(404)
          .json({ error: `Product ${productId} not found` });
      }
      validProducts.push(productId);
      totalAmount += product.price;
    }

    // Create order with delivery address
    const order = new Order({
      userId: req.user.id,
      products: validProducts,
      paymentMethod,
      totalAmount,
      deliveryAddress: {
        addressLine: selectedAddress.addressLine,
        city: selectedAddress.city,
        state: selectedAddress.state,
        pinCode: selectedAddress.pinCode,
        alternativeAddress: selectedAddress.alternativeAddress,
        alternativeContact: selectedAddress.alternativeContact,
      },
    });

    // Handle online payment
    if (paymentMethod === "online") {
      const razorpayOrder = await razorpay.orders.create({
        amount: Math.round(totalAmount * 100),
        currency: "INR",
        receipt: order._id.toString(),
      });

      order.razorpayOrder = {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
      };
    }

    await order.save();

    // Clear cart after successful order creation
    user.cart = user.cart.filter(
      (cartItem) => !products.includes(cartItem.toString())
    );
    await user.save();

    const response = {
      message: "Order created successfully",
      order: await order.populate("products"),
    };

    if (paymentMethod === "online") {
      response.razorpayOrder = order.razorpayOrder;
    }

    res.status(201).json(response);
  } catch (error) {
    console.error("Order creation error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Get all orders (admin only)
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("userId", "firstName lastName email phoneNumber")
      .populate("products");
    res.json(orders);
  } catch (error) {
    console.error("Get all orders error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Get order by ID
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("userId", "firstName lastName email phoneNumber")
      .populate("products");

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Check authorization
    if (order.userId._id.toString() !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: "Not authorized" });
    }

    res.json(order);
  } catch (error) {
    console.error("Get order by ID error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Get user's orders
exports.getUserOrders = async (req, res) => {
  try {
    // Ensure user can only access their own orders unless admin
    if (req.params.userId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const orders = await Order.find({ userId: req.params.userId })
      .populate("products")
      .sort({ time: -1 });
    res.json(orders);
  } catch (error) {
    console.error("Get user orders error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Update order status
exports.updateOrder = async (req, res) => {
  try {
    const { status, deliveryDate } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        status,
        ...(deliveryDate && { deliveryDate: new Date(deliveryDate) }),
      },
      { new: true }
    ).populate("userId products");

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({
      message: "Order updated successfully",
      order,
    });
  } catch (error) {
    console.error("Update order error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Delete order
exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.status !== "pending") {
      return res.status(400).json({ error: "Can only delete pending orders" });
    }

    await Order.findByIdAndDelete(req.params.id);
    res.json({ message: "Order deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

// Verify Razorpay payment
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      const order = await Order.findOne({
        "razorpayOrder.id": razorpay_order_id,
      });

      if (order) {
        order.isPaid = true;
        order.status = "processing";
        await order.save();
      }

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
};

// Handle Razorpay webhook
exports.handleWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (signature === expectedSignature) {
      const event = req.body;

      if (event.event === "payment.captured") {
        const order = await Order.findOne({
          "razorpayOrder.id": event.payload.order.entity.id,
        });

        if (order) {
          order.isPaid = true;
          order.status = "processing";
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
};
