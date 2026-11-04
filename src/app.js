import express from "express";
import authRoutes from './modules/auth/auth.routes.js';
import receiptRoutes from './modules/receipts/receipt.routes.js';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "ShopFloor API is running",
    });
});

// API routes will be registered here
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/materials', receiptRoutes);

// Global error handler
app.use((err, req, res, next) => {
    const statusCode = err.statusCode || err.status || 500;

    res.status(statusCode).json({
        success: false,
        data: null,
        message: statusCode === 500 ? 'Internal server error' : err.message,
        error: {
            message: statusCode === 500
                ? 'Internal server error'
                : err.message
        }
    });
});

export default app;
