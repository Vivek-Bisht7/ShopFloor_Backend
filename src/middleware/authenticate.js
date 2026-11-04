import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

const authenticate = async (req, res, next) => {
    try {
        // 1. Get token from Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                data: null,
                error: { message: 'Authentication token required' }
            });
        }

        const token = authHeader.split(' ')[1];

        // 2. Verify token
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // 3. Load current user and role from database
        const result = await pool.query(
            `SELECT
                users.id,
                users.email,
                users.is_active,
                roles.name AS role
             FROM users
             JOIN roles ON users.role_id = roles.id
             WHERE users.id = $1`,
            [decoded.sub]
        );

        const user = result.rows[0];

        // 4. Check user existence and active status
        if (!user || !user.is_active) {
            return res.status(401).json({
                success: false,
                data: null,
                error: { message: 'Invalid or inactive user' }
            });
        }

        // 5. Attach user to request
        req.user = {
            id: user.id,
            email: user.email,
            role: user.role
        };

        next();

    } catch (error) {
        return res.status(401).json({
            success: false,
            data: null,
            error: { message: 'Invalid or expired token' }
        });
    }
};

export default authenticate;