import { createMaterialReceipt } from './receipt.service.js';

export const recordReceipt = async (req, res, next) => {
    try {
        const { materialId, supplierId, quantity, reference } = req.validatedReceipt;
        const userId = req.user.id;

        const receipt = await createMaterialReceipt({
            materialId,
            supplierId,
            quantity,
            reference,
            userId
        });

        return res.status(201).json({
            message: 'Material receipt recorded successfully',
            receipt
        });
    } catch (error) {
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json({
            success: false,
            message: statusCode === 500 ? 'Internal server error' : error.message,
            error: {
                message: statusCode === 500 ? 'Internal server error' : error.message
            }
        });
    }
};
