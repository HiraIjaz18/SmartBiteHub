import mongoose from "mongoose";

const forgetpasswordSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    otp:{
        otp:{type:String},
        sendTime:{type:Number},
        token:{type:String}
    }
},{timestamps:true})

const forgetpasswordModel = mongoose.models.forgetpassword || mongoose.model("forgetpassword", forgetpasswordSchema);
export default forgetpasswordModel;