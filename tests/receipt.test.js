import http from 'http';
import app from '../src/app.js';
import pool from '../src/config/db.js';
import { createMaterialReceipt } from '../src/modules/receipts/receipt.service.js';

async function runTests() {
    console.log('--- Starting ShopFloor Receipts API Tests ---');

    // Start server on an ephemeral port
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    const baseUrl = `http://localhost:${port}`;

    let passedTests = 0;
    let failedTests = 0;

    const assert = (condition, name) => {
        if (condition) {
            console.log(`[PASS] ${name}`);
            passedTests++;
        } else {
            console.error(`[FAIL] ${name}`);
            failedTests++;
        }
    };

    try {
        // 1. Obtain tokens for Admin, Planner, Operator via login
        console.log('\nLogging in test users...');
        const login = async (email, password) => {
            const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            return { status: res.status, data: data.data };
        };

        const adminLogin = await login('admin@shopfloor.com', 'Password@123');
        const plannerLogin = await login('planner@shopfloor.com', 'Password@123');
        const operatorLogin = await login('operator@shopfloor.com', 'Password@123');

        assert(adminLogin.status === 200 && adminLogin.data.accessToken, 'Admin login succeeds');
        assert(plannerLogin.status === 200 && plannerLogin.data.accessToken, 'Planner login succeeds');
        assert(operatorLogin.status === 200 && operatorLogin.data.accessToken, 'Operator login succeeds');

        const adminToken = adminLogin.data.accessToken;
        const adminId = adminLogin.data.user.id;
        const plannerToken = plannerLogin.data.accessToken;
        const plannerId = plannerLogin.data.user.id;
        const operatorToken = operatorLogin.data.accessToken;

        // Fetch valid material and supplier IDs
        const matRes = await pool.query('SELECT id FROM materials ORDER BY id LIMIT 1');
        const validMaterialId = matRes.rows[0].id;
        const supRes = await pool.query('SELECT id FROM suppliers ORDER BY id LIMIT 1');
        const validSupplierId = supRes.rows[0].id;

        console.log(`Using validMaterialId: ${validMaterialId}, validSupplierId: ${validSupplierId}`);

        // --- Test 1: Unauthenticated user receives 401 ---
        console.log('\nTest Case: Unauthenticated user receives 401');
        const resNoAuth = await fetch(`${baseUrl}/api/v1/materials/${validMaterialId}/receipts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ supplier_id: validSupplierId, quantity: 10 })
        });
        assert(resNoAuth.status === 401, 'Unauthenticated request returns 401');

        // --- Test 2: Operator receives 403 ---
        console.log('\nTest Case: Operator receives 403');
        const resOperator = await fetch(`${baseUrl}/api/v1/materials/${validMaterialId}/receipts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${operatorToken}`
            },
            body: JSON.stringify({ supplier_id: validSupplierId, quantity: 10 })
        });
        assert(resOperator.status === 403, 'Operator receiving stock returns 403 Forbidden');

        // --- Test 3: Invalid material ID format returns 400 ---
        console.log('\nTest Case: Invalid material ID format returns 400');
        const resInvalidMatId = await fetch(`${baseUrl}/api/v1/materials/invalid-id/receipts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({ supplier_id: validSupplierId, quantity: 10 })
        });
        assert(resInvalidMatId.status === 400, 'Non-integer material ID returns 400');

        const resZeroMatId = await fetch(`${baseUrl}/api/v1/materials/0/receipts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({ supplier_id: validSupplierId, quantity: 10 })
        });
        assert(resZeroMatId.status === 400, 'Zero material ID returns 400');

        // --- Test 4: Nonexistent material returns 404 ---
        console.log('\nTest Case: Nonexistent material returns 404');
        const resNonexistentMat = await fetch(`${baseUrl}/api/v1/materials/999999/receipts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({ supplier_id: validSupplierId, quantity: 10 })
        });
        assert(resNonexistentMat.status === 404, 'Nonexistent material returns 404 Not Found');

        // --- Test 5: Missing supplier ID is rejected (400) ---
        console.log('\nTest Case: Missing supplier ID is rejected');
        const resMissingSupplier = await fetch(`${baseUrl}/api/v1/materials/${validMaterialId}/receipts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({ quantity: 10 })
        });
        assert(resMissingSupplier.status === 400, 'Missing supplier ID returns 400');

        // --- Test 6: Invalid supplier ID format is rejected (400) ---
        console.log('\nTest Case: Invalid supplier ID is rejected');
        const resInvalidSupplier = await fetch(`${baseUrl}/api/v1/materials/${validMaterialId}/receipts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({ supplier_id: 'bad-supplier', quantity: 10 })
        });
        assert(resInvalidSupplier.status === 400, 'String supplier ID returns 400');

        const resZeroSupplier = await fetch(`${baseUrl}/api/v1/materials/${validMaterialId}/receipts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({ supplier_id: 0, quantity: 10 })
        });
        assert(resZeroSupplier.status === 400, 'Zero supplier ID returns 400');

        // --- Test 7: Nonexistent supplier returns 404 ---
        console.log('\nTest Case: Nonexistent supplier returns 404');
        const resNonexistentSup = await fetch(`${baseUrl}/api/v1/materials/${validMaterialId}/receipts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({ supplier_id: 999999, quantity: 10 })
        });
        assert(resNonexistentSup.status === 404, 'Nonexistent supplier returns 404 Not Found');

        // --- Test 8: Zero, negative, missing, or invalid quantity is rejected (400) ---
        console.log('\nTest Case: Zero or negative quantity is rejected');
        const resZeroQty = await fetch(`${baseUrl}/api/v1/materials/${validMaterialId}/receipts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({ supplier_id: validSupplierId, quantity: 0 })
        });
        assert(resZeroQty.status === 400, 'Zero quantity returns 400');

        const resNegQty = await fetch(`${baseUrl}/api/v1/materials/${validMaterialId}/receipts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({ supplier_id: validSupplierId, quantity: -25 })
        });
        assert(resNegQty.status === 400, 'Negative quantity returns 400');

        const resMissingQty = await fetch(`${baseUrl}/api/v1/materials/${validMaterialId}/receipts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({ supplier_id: validSupplierId })
        });
        assert(resMissingQty.status === 400, 'Missing quantity returns 400');

        const resNaNQty = await fetch(`${baseUrl}/api/v1/materials/${validMaterialId}/receipts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({ supplier_id: validSupplierId, quantity: 'not-a-number' })
        });
        assert(resNaNQty.status === 400, 'Invalid string quantity returns 400');

        // --- Test 9: Admin can record a receipt & Stock / DB validation ---
        console.log('\nTest Case: Admin can record a receipt');
        // Initial stock check
        const initialStockRes = await pool.query(
            'SELECT on_hand, reserved FROM material_stock WHERE material_id = $1',
            [validMaterialId]
        );
        const initialOnHand = Number(initialStockRes.rows[0]?.on_hand || 0);
        const initialReserved = Number(initialStockRes.rows[0]?.reserved || 0);

        const receiptQty1 = 100;
        const resAdminReceipt = await fetch(`${baseUrl}/api/v1/materials/${validMaterialId}/receipts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({
                supplier_id: validSupplierId,
                quantity: receiptQty1,
                received_by: 9999 // Client attempts to forge received_by
            })
        });

        assert(resAdminReceipt.status === 201, 'Admin receipt returns 201 Created');
        const adminBody = await resAdminReceipt.json();
        assert(adminBody.message === 'Material receipt recorded successfully', 'Response has correct success message');
        assert(adminBody.receipt !== undefined, 'Response contains receipt object');
        assert(adminBody.receipt.material_id === validMaterialId, 'Receipt has correct material_id');
        assert(adminBody.receipt.supplier_id === validSupplierId, 'Receipt has correct supplier_id');
        assert(adminBody.receipt.quantity === receiptQty1, 'Receipt has numeric quantity');
        assert(adminBody.receipt.received_by === adminId, 'Receipt records authenticated admin user ID (not forged client ID)');

        // Verify material_stock: on_hand increased, reserved unchanged
        const afterStock1 = await pool.query(
            'SELECT on_hand, reserved FROM material_stock WHERE material_id = $1',
            [validMaterialId]
        );
        const afterOnHand1 = Number(afterStock1.rows[0].on_hand);
        const afterReserved1 = Number(afterStock1.rows[0].reserved);
        assert(afterOnHand1 === initialOnHand + receiptQty1, 'Successful receipt increases on_hand');
        assert(afterReserved1 === initialReserved, 'reserved remains unchanged');

        // Verify goods_receipts record created
        const grRes = await pool.query(
            'SELECT * FROM goods_receipts WHERE id = $1',
            [adminBody.receipt.id]
        );
        assert(grRes.rows.length === 1, 'A goods receipt record is created');
        assert(Number(grRes.rows[0].quantity) === receiptQty1, 'goods_receipts quantity matches');
        assert(grRes.rows[0].received_by === adminId, 'goods_receipts received_by is admin ID');

        // Verify stock_movements record created
        const smRes = await pool.query(
            'SELECT * FROM stock_movements WHERE material_id = $1 AND user_id = $2 ORDER BY id DESC LIMIT 1',
            [validMaterialId, adminId]
        );
        assert(smRes.rows.length === 1, 'A stock movement record is created');
        assert(smRes.rows[0].type === 'RECEIPT', 'Stock movement type is RECEIPT');
        assert(Number(smRes.rows[0].quantity) === receiptQty1, 'Stock movement quantity matches');
        assert(smRes.rows[0].user_id === adminId, 'Stock movement user_id is authenticated user');

        // --- Test 10: Planner can record a receipt ---
        console.log('\nTest Case: Planner can record a receipt');
        const receiptQty2 = 50;
        const resPlannerReceipt = await fetch(`${baseUrl}/api/v1/materials/${validMaterialId}/receipts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${plannerToken}`
            },
            body: JSON.stringify({
                supplier_id: validSupplierId,
                quantity: receiptQty2
            })
        });

        assert(resPlannerReceipt.status === 201, 'Planner receipt returns 201 Created');
        const plannerBody = await resPlannerReceipt.json();
        assert(plannerBody.receipt.received_by === plannerId, 'Receipt records planner user ID');

        const afterStock2 = await pool.query(
            'SELECT on_hand, reserved FROM material_stock WHERE material_id = $1',
            [validMaterialId]
        );
        assert(Number(afterStock2.rows[0].on_hand) === afterOnHand1 + receiptQty2, 'Planner receipt increases on_hand');
        assert(Number(afterStock2.rows[0].reserved) === initialReserved, 'reserved remains unchanged after planner receipt');

        // --- Test 11: Transaction rollback on failure ---
        console.log('\nTest Case: If one database operation fails, all changes roll back');
        const stockBeforeRollback = await pool.query('SELECT on_hand FROM material_stock WHERE material_id = $1', [validMaterialId]);
        const grCountBefore = await pool.query('SELECT COUNT(*) FROM goods_receipts WHERE material_id = $1', [validMaterialId]);
        const smCountBefore = await pool.query('SELECT COUNT(*) FROM stock_movements WHERE material_id = $1', [validMaterialId]);

        // Attempt receipt with an invalid user_id that triggers a foreign key constraint violation on received_by or user_id
        let caughtError = null;
        try {
            await createMaterialReceipt({
                materialId: validMaterialId,
                supplierId: validSupplierId,
                quantity: 200,
                reference: 'ROLLBACK_TEST',
                userId: 999999 // non-existent user violates FK
            });
        } catch (e) {
            caughtError = e;
        }

        assert(caughtError !== null, 'Service caught and threw error on FK violation');

        const stockAfterRollback = await pool.query('SELECT on_hand FROM material_stock WHERE material_id = $1', [validMaterialId]);
        const grCountAfter = await pool.query('SELECT COUNT(*) FROM goods_receipts WHERE material_id = $1', [validMaterialId]);
        const smCountAfter = await pool.query('SELECT COUNT(*) FROM stock_movements WHERE material_id = $1', [validMaterialId]);

        assert(Number(stockAfterRollback.rows[0].on_hand) === Number(stockBeforeRollback.rows[0].on_hand), 'material_stock rolled back to original');
        assert(Number(grCountAfter.rows[0].count) === Number(grCountBefore.rows[0].count), 'No goods_receipt created during rollback');
        assert(Number(smCountAfter.rows[0].count) === Number(smCountBefore.rows[0].count), 'No stock_movement created during rollback');

        console.log(`\n========================================`);
        console.log(`Total tests: ${passedTests + failedTests}`);
        console.log(`Passed: ${passedTests}`);
        console.log(`Failed: ${failedTests}`);
        console.log(`========================================`);

        if (failedTests > 0) {
            process.exit(1);
        }

    } catch (err) {
        console.error('Unexpected error running tests:', err);
        process.exit(1);
    } finally {
        server.close();
        await pool.end();
    }
}

runTests();
