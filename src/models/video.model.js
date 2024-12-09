import mongoose, {Schema} from "mongoose";

const videoSchema = new Schema({
    videoFile:{
        type: String,
        required: true,
    },
    thumbnail: {
        type: String,
        required: true,

    },
    title: {
        type : String,
        required: true
    },
    description:{
        type : String,
        required: true
    },
    duration:{
        Number,
        required: true,
    }

},{timestamps: true})

export const Video = mongoose.model("Video", videoSchema )