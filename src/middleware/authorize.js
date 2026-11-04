const authorize = (allowedRoles) => {

    return (req, res, next) => {

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                data: null,
                error: {
                    message: 'You are not authorized to access this resource'
                }
            });
        }

        next();
    };
};

export default authorize;