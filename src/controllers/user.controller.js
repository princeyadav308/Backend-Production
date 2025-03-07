import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import {uploadCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";



const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return {accessToken, refreshToken}

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }
}


const registerUser = asyncHandler( async (req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists : username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in DB
    // remove password and refresh token field from response
    // check for user creation
    // return response


    // Extract all data points
    const {fullName, email, username, password } =  req.body

    if (
        [fullName, email, username, password].some((filed) => filed?.trim() === "")
    ){
        throw new ApiError(400, "All fields are required")
    }


    // Check if user already existed for the given username or email
    const existedUser = await User.findOne({
        $or: [{username}, {email}]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }
    

    // Local file for avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.       coverImage) && req.files.coverImage.length > 0) {
    coverImageLocalPath = req.files.coverImage[0].path
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required")
    }

    // Upload image on cloudinary
    const avatar = await uploadCloudinary(avatarLocalPath);
    const coverImage = await uploadCloudinary(coverImageLocalPath);


    if (!avatar) {
        throw new ApiError(400 , "Avatar is required")
    }

    // create object for avatar image 
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })


    // Remove password and refreshToken
    const createUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createUser) {
        throw new ApiError(500, "Something went wrong while registering userm")
    }

    return res.status(201).json(
        new ApiResponse(200, createUser, "User Registered Successfully")
    )

} )

const loginUser = asyncHandler(async (req, res) => {
    // req body => data
    // check if fields are not empty
    // username or email and password required
    // check if username or email already exists
    // check if password matches with given username or email
    // give access and refreshToken
    // send cookie


    const {email, username, password} = req.body

    if (!username && !email) {
        throw new ApiError(400, "Username or Email is required")
    }

    const user = await User.findOne({
        $or: [{username} , {email}]
    })

    if (!user) {
        throw new ApiError(404, "User doesnot exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken).json(
        new ApiResponse(
            200, {
                user:loggedInUser, accessToken, refreshToken
            },
            "User logged in Successfully"
        )
    )

})

const logoutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200).clearCookie("accessToken", options).clearCookie("refreshToken", options).json(new ApiResponse(200, {}, "User logged Out"))
})

const refreshAccessToken = asyncHandler(async(req, res) => {
    const incommingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incommingRefreshToken) {
        throw new ApiError(401, "Unauthorized Request")
    }

    try {
        const decodedToken = jwt.verify(
            incommingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET,
        )
    
        User.findById(decodedToken?._id)
    
        if (!user) {
            throw new ApiError(401, "Invalid Refresh Token")
        }
    
        if (incommingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh Token is invalid")
            
        }
    
        const options = {
            httpOnly: true,
            secure: true    
        }
    
        const {accessToken, newRefreshToken}= await generateAccessAndRefreshTokens(user._id)
    
        return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", newRefreshToken, options).json(
            new ApiResponse(200, {accessToken, refreshToken: newRefreshToken}, "Access Token Refreshed Successfully")
        )
    } catch (error) {
        throw new ApiError(401, error?.message ||  "Invalid Refresh Token")
    }

})

const changeCurrentPassword = asyncHandler(async(req, res) => {
    const {oldPassword, newPassword} = req.body

    if (!oldPassword || !newPassword) {
        throw new ApiError(400, "Old Password and New Password is required")
    }

    const user = await User.findById(req.user?._id)

    const isPasswordValid = await user.isPasswordCorrect(oldPassword)
 
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid Password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false});

    return res.status(200).json(new ApiResponse(200, {}, "Password Changed Successfully"))
})

const getCurretUser = asyncHandler(async(req, res) => {
    const user = await User.findById(req.user._id).select("-password -refreshToken")

    return res.status(200).json(new ApiResponse(200, user, "User Details"))
})

const updateAccountDetails = asyncHandler(async(req, res) => {
    const {fullName, email, username} = req.body

    if (!fullName && !email && !username) {
        throw new ApiError(400, "Atleast one field is required")
    }

    const user = User.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                fullName,
                email
            }
        },
        {
            new: true
        }).select("-password -refreshToken")

        return res.status(200).json(new ApiResponse(200, user, "User Details Updated Successfully"))

})

const updateAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.avatar[0]?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required")
    }

    const avatar = await uploadCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "Avatar is required")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {
            new: true
        }
    ).select("-password -refreshToken")

    return res.status(200).json(new ApiResponse(200, user, "Avatar Updated Successfully"))
})

const updateUserCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.file?.coverImage[0]?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover Image is required")
    }

    const coverImage = await uploadCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Cover Image is required")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {
            new: true
        }
    ).select("-password -refreshToken")

    return res.status(200).json(new ApiResponse(200, user, "Cover Image Updated Successfully"))
})

const getUserChannelProfile = asyncHandler(async(req, res) => {
    const {username} = req.params

    if (!username?.trim()) {
        throw new ApiError(400, "Username is required")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                totalSubscribers: {$size: "$subscribers"},

                totalChannelSubscribedTo: {$size: "$subscribedTo"},
            
                isSubscribed: {
                    $cond: {
                        if: {
                            $in: [req.user?._id, "$subscribers.subscriber"]
                        },
                        then: true,
                        else: false
                    }
                }
            }
        },

        {
            $project: {
                password: 0,
                refreshToken: 0,
                totalSubscribers: 1,
                avatar: 1,
                coverImage: 1,
                totalChannelSubscribedTo: 1,
                email: 1,
            }
        }
    ])

    if (!channel?.length) {
        throw new ApiError(404, "Channel not found")
    }

    return res.status(200).json(new ApiResponse(200, channel[0], "Channel Profile"))

})

export {registerUser, loginUser, logoutUser,refreshAccessToken, changeCurrentPassword, getCurretUser, updateAccountDetails, updateAvatar, updateUserCoverImage, getUserChannelProfile}  