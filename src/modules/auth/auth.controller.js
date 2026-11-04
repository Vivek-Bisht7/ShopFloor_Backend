import { loginUser } from './auth.service.js';

export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                data: null,
                error: {
                    message: 'Email and password are required'
                }
            });
        }

        const result = await loginUser(email, password);

        return res.status(200).json({
            success: true,
            data: result,
            error: null
        });

    } catch (error) {
        next(error);
    }
};