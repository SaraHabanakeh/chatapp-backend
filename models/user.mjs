// user.mjs

import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    username: { type: String, required: true },
    password: { type: String, required: true, minlength: 6 }
});

const UserModel = mongoose.model('User', userSchema);

export default UserModel;
