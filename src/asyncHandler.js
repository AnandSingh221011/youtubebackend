const asyncHandler = (requestHandler) => {
    return async (req, res, next) => {
        try {
            await requestHandler(req, res, next);
        } catch (error) {
            res.status(error.code || 500).json({
                success: false,
                message: error.message,
            });
        }
    };
};

export { asyncHandler };

// const asynHandler = (requestHandler) => {
//    (req, res, next) => {
//        Promise.resolve(requestHandler(req, res, next)).catch((error) =>
//            next(error)
//        );
//    };
// };
