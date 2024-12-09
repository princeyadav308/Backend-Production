import mongoose, {Schema} from "mongoose";

const userSchema = new Schema({
    username: {
        type: String,
        required: true, 
        unique : true,
        lowercase: true,
        trim: true,
        index: true
    },
    email:{
        type: String,
        required: true,
        lowercase: true,
        unique: true,

    },
    fullName: {
        type : String,
        required: true,
        trim: true,
        index: true,
    },
    avatar:{
        type : String, //Cloudinary url
        required: true,
    },
    coverImage:{
        type:String,

    },
    watchHistory:[
        {
            type: Schema.Types.ObjectId,
            ref: "Video"
        }
    ],
    password: {
        type: String,
        required: [true, 'Password is required'],
        
    },
    refreshToken:{
        type: String,
    },

},{timestamps: true})



export const User = mongoose.model("User", userSchema)
