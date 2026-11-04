import pool from '../../config/db.js';

export const createMaterialReceipt = async ({
    materialId,
    supplierId,
    quantity,
    reference,
    userId
}) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Verify material exists
        const materialCheck = await client.query(
            'SELECT id FROM materials WHERE id = $1',
            [materialId]
        );

        if (materialCheck.rows.length === 0) {
            const error = new Error('Material not found');
            error.statusCode = 404;
            throw error;
        }

        // 2. Verify supplier exists
        const supplierCheck = await client.query(
            'SELECT id FROM suppliers WHERE id = $1',
            [supplierId]
        );

        if (supplierCheck.rows.length === 0) {
            const error = new Error('Supplier not found');
            error.statusCode = 404;
            throw error;
        }

        // 3. Ensure material_stock record exists for this material
        await client.query(
            `INSERT INTO material_stock (material_id, on_hand, reserved)
             VALUES ($1, 0, 0)
             ON CONFLICT (material_id) DO NOTHING`,
            [materialId]
        );

        // Operation 1: Update material stock (increase on_hand by received quantity)
        await client.query(
            `UPDATE material_stock
             SET on_hand = on_hand + $1
             WHERE material_id = $2`,
            [quantity, materialId]
        );

        // Operation 2: Insert goods receipt
        const receiptResult = await client.query(
            `INSERT INTO goods_receipts
             (material_id, supplier_id, quantity, received_by)
             VALUES ($1, $2, $3, $4)
             RETURNING id, material_id, supplier_id, quantity, received_by`,
            [materialId, supplierId, quantity, userId]
        );

        const createdReceipt = receiptResult.rows[0];

        // Operation 3: Insert stock movement
        await client.query(
            `INSERT INTO stock_movements
             (material_id, type, quantity, reference, user_id)
             VALUES ($1, 'RECEIPT', $2, $3, $4)`,
            [materialId, quantity, reference, userId]
        );

        await client.query('COMMIT');

        return {
            id: createdReceipt.id,
            material_id: createdReceipt.material_id,
            supplier_id: createdReceipt.supplier_id,
            quantity: Number(createdReceipt.quantity),
            received_by: createdReceipt.received_by
        };

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};
