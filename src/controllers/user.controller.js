import { asyncHandler } from "../asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(
            500,
            "Something went wrong while generating Access and Refresh Tokens"
        );
    }
};

const registerUser = asyncHandler(async (req, res) => {
    try {
        const { username, fullName, email, password } = req.body;
        if (
            [fullName, email, username, password].some(
                (field) => field?.trim() === ""
            )
        ) {
            throw new ApiError(400, "All fields are required");
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new ApiError(400, "Invalid email format");
        }

        const existingUser = await User.findOne({
            $or: [{ username }, { email }],
        });

        if (existingUser) {
            throw new ApiError(
                409,
                "User with Email or User Name already exists."
            );
        }

        const avtarLocalPath = req.files?.avatar[0]?.path;
        const coverImagePath = req.files?.coverImage[0]?.path;

        if (!avtarLocalPath) {
            throw new ApiError(400, "Avtar file is required");
        }

        const avatar = await uploadOnCloudinary(avtarLocalPath);
        const coverImage = await uploadOnCloudinary(coverImagePath);

        if (!avatar) {
            throw new ApiError(400, "Avatar file is required");
        }

        const user = await User.create({
            fullName,
            avatar: avatar.url,
            coverImage: coverImage?.url || "",
            email,
            password,
            userName: username.toLowerCase(),
        });

        const createdUser = await User.findById(user._id).select(
            "-password -refreshToken"
        );

        if (!createdUser) {
            throw new ApiError(
                500,
                "Something went wrong while registering the User"
            );
        }

        return res
            .status(201)
            .json(
                new ApiResponse(
                    201,
                    createdUser,
                    "User Registered Successfully"
                )
            );
    } catch (error) {
        throw new ApiError(500, "An Error occured while Registering the User");
    }
});

const loginUser = asyncHandler(async (req, res) => {
    // req body - data
    // username or email
    // find the user
    //password check
    // access token and refresh token
    // send in cookies
    //success response

    try {
        const { email, username, password } = req.body;
        if (!username || !email) {
            if (!username && !email) {
                throw new ApiError(400, "username or email is required");
            }
        }
        const user = await User.findOne({ $or: [{ username }, { email }] });

        if (!user) {
            throw new ApiError(404, "User does not exists");
        }

        const isPasswordValid = await user.checkPassword(password);

        if (!isPasswordValid) {
            throw new ApiError(401, "Invalid Password");
        }
        const { accessToken, refreshToken } =
            await generateAccessAndRefreshTokens(user._id);

        const loggedInUser = await User.findById(user._id).select(
            "-password -refreshToken"
        );

        const options = {
            httpOnly: true,
            secure: true,
        };

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    {
                        user: loggedInUser,
                        accessToken,
                        refreshToken,
                    },
                    "User logged in Successfully"
                )
            );
    } catch (error) {
        throw new ApiError(500, "Error occured while logging the user In");
    }
});

const logoutUser = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        await User.findByIdAndUpdate(
            userId,
            {
                $set: {
                    refreshToken: undefined,
                },
            },
            {
                new: true,
            }
        );
        const options = {
            httpOnly: true,
            secure: true,
        };

        return res
            .status(200)
            .clearCookie("accessToken", options)
            .clearCookie("refreshToken", options)
            .json(new ApiResponse(200, {}, "User Logged Out Successfully"));
    } catch (error) {
        throw new ApiError(401, "User not found");
    }
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken =
        req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized Request");
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            REFRESH_TOKEN_SECRET
        );

        const user = await User.findById(decodedToken._id);

        if (!user) {
            throw new ApiError(401, "Invalid Refresh Token");
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token has expired or used");
        }

        const options = {
            httpOnly: true,
            secure: true,
        };

        const { accessToken, newRefreshToken } =
            await generateAccessAndRefreshTokens(user._id);

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                ApiResponse(
                    200,
                    { accessToken, newRefreshToken },
                    "Access Token Refreshed "
                )
            );
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Refresh Token");
    }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const user = await User.findById(req.user._id);
        if (!user) {
            throw new ApiError(401, "Invalid Refresh Token");
        }

        const isPasswordValid = await user.checkPassword(oldPassword);

        if (!isPasswordValid) {
            throw new ApiError(401, "Invalid Password");
        }

        user.password = newPassword;
        await user.save({ validateBeforeSave: false });

        return res
            .status(200)
            .json(new ApiResponse(200, {}, "Password changed successfully"));
    } catch (error) {
        throw new ApiError(500, "Error while Updating the Password");
    }
});

const getCurrentUser = asyncHandler(async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            throw new ApiError(401, "Such User is not Present");
        }

        return res
            .status(200)
            .json(
                new ApiResponse(200, user, "Current User fetched Successfully")
            );
    } catch (error) {
        throw new ApiError(500, "Error occured while fetching current User.");
    }
});

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { userName, email, fullName } = req.body;
    if (!userName || !email || fullName) {
        throw new ApiError(400, "All fileds are required");
    }

    try {
        const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set: {
                    fullName,
                    email,
                    userName,
                },
            },
            { new: true }
        ).select("password");

        return res
            .status(200)
            .json(
                new ApiResponse(200, user, "User Details Updated Successfully")
            );
    } catch (error) {
        throw new ApiError(500, "An Error occured while updating the User");
    }
});

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading avatar");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url,
            },
        },
        {
            new: true,
        }
    ).select("-password");

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "User Avatar image Update Successfully")
        );
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path;
    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is missing");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading Cover image");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url,
            },
        },
        {
            new: true,
        }
    ).select("-password");

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user,
                "Update the User Cover Image Successfully"
            )
        );
});

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
};
