const express = require("express");
const router = express.Router();
const {
  verifyToken,
  verifyTokenandAuthorization,
  verifyTokenandAdmin,
} = require("../middlewares/verifyToken");
const orderController = require("../controllers/orderControllers");

// Create a new order
router.post("/", verifyToken, orderController.createOrder);

// Get all orders (admin only)
router.get("/", verifyTokenandAdmin, orderController.getAllOrders);

// Get order by ID
router.get("/:id", verifyToken, orderController.getOrderById);

// Get orders by user ID
router.get(
  "/user/:userId",
  // verifyTokenandAuthorization,
  verifyToken,
  orderController.getUserOrders
);

// Update order status
router.put("/:id", verifyTokenandAdmin, orderController.updateOrder);

// Delete order
router.delete("/:id", verifyTokenandAdmin, orderController.deleteOrder);

// Verify Razorpay payment
router.post("/payment/verify", verifyToken, orderController.verifyPayment);

// Razorpay webhook handler
router.post("/payment/webhook", orderController.handleWebhook);

module.exports = router;
