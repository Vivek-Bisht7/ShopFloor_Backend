import pool from '../../config/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export const loginUser = async (email, password) => {

    // 1. Find user and their role
    const result = await pool.query(
        `SELECT
            users.id,
            users.email,
            users.password_hash,
            users.is_active,
            roles.name AS role
         FROM users
         JOIN roles ON users.role_id = roles.id
         WHERE users.email = $1`,
        [email]
    );

    const user = result.rows[0];

    // 2. Check if user exists
    if (!user) {
        throw Object.assign(new Error('Invalid email or password'), {
            statusCode: 401
        });
    }

    // 3. Check password
    const isPasswordValid = await bcrypt.compare(
        password,
        user.password_hash
    );

    if (!isPasswordValid) {
        throw Object.assign(new Error('Invalid email or password'), {
            statusCode: 401
        });
    }

    // 4. Check whether user is active
    if (!user.is_active) {
        throw Object.assign(new Error('Account is inactive'), {
            statusCode: 401
        });
    }

    // 5. Generate JWT
    const token = jwt.sign(
        {
            sub: user.id,
            role: user.role
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || '1h'
        }
    );

    // 6. Return token and user details
    return {
        accessToken: token,
        user: {
            id: user.id,
            email: user.email,
            role: user.role
        }
    };
};