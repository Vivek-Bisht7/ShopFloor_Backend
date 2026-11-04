export const validateReceiptInput = (req, res, next) => {
    // 1. Validate Material ID from URL params (:id)
    const rawMaterialId = req.params.id;
    const isMaterialIdValid =
        rawMaterialId !== undefined &&
        rawMaterialId !== null &&
        /^\d+$/.test(String(rawMaterialId).trim()) &&
        parseInt(rawMaterialId, 10) > 0;

    if (!isMaterialIdValid) {
        return res.status(400).json({
            success: false,
            message: 'Invalid material ID',
            error: {
                message: 'Invalid material ID'
            }
        });
    }

    const body = req.body || {};

    // 2. Validate Supplier ID from request body
    const rawSupplierId = body.supplier_id;
    const isSupplierIdProvided = rawSupplierId !== undefined && rawSupplierId !== null;
    const isSupplierIdValid =
        isSupplierIdProvided &&
        typeof rawSupplierId !== 'boolean' &&
        typeof rawSupplierId !== 'object' &&
        /^\d+$/.test(String(rawSupplierId).trim()) &&
        parseInt(rawSupplierId, 10) > 0;

    if (!isSupplierIdValid) {
        return res.status(400).json({
            success: false,
            message: 'Valid supplier ID is required',
            error: {
                message: 'Valid supplier ID is required'
            }
        });
    }

    // 3. Validate Quantity from request body
    const rawQuantity = body.quantity;
    const isQuantityProvided = rawQuantity !== undefined && rawQuantity !== null;
    const isQuantityNumeric =
        isQuantityProvided &&
        typeof rawQuantity !== 'boolean' &&
        typeof rawQuantity !== 'object' &&
        String(rawQuantity).trim() !== '' &&
        !isNaN(Number(rawQuantity)) &&
        isFinite(Number(rawQuantity));

    const quantityNum = Number(rawQuantity);

    if (!isQuantityNumeric || quantityNum <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Quantity must be a valid positive number',
            error: {
                message: 'Quantity must be a valid positive number'
            }
        });
    }

    req.validatedReceipt = {
        materialId: parseInt(rawMaterialId, 10),
        supplierId: parseInt(rawSupplierId, 10),
        quantity: quantityNum,
        reference: typeof body.reference === 'string' && body.reference.trim() !== '' ? body.reference.trim() : null
    };

    next();
};
