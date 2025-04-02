import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import 'dotenv/config';
import UserModel from './user.mjs';

const jwtSecret = process.env.JWTSECRET;

const auth = {
    register: async function(body) {
        const { email, username, password } = body;

        if (!email || !password || !username) {
            return {
                errors: {
                    status: 401,
                    source: "/register",
                    title: "Missing fields",
                    detail: "Email, username or password missing in request"
                }
            };
        }

        const hash = await bcrypt.hash(password, 10).catch(err => {
            return {
                errors: {
                    status: 500,
                    source: "/register",
                    title: "bcrypt error",
                    detail: err.message
                }
            };
        });

        try {
            const existingUser = await UserModel.findOne({ email: email.toLowerCase() });
            if (existingUser) {
                return {
                    errors: {
                        status: 409,
                        source: "/register",
                        title: "Email already registered",
                        detail: "A user with the provided email already exists.",
                    },
                };
            }

            const newUser = new UserModel({
                email: email.toLowerCase(),
                username,
                password: hash,
            });

            await newUser.save();

            return {
                data: {
                    message: "User successfully registered.",
                    user: { email: newUser.email, username: newUser.username },
                },
            };
        } catch (e) {
            return {
                errors: {
                    status: 500,
                    source: "/register",
                    title: "Database error",
                    detail: e.message,
                },
            };
        }
    },

    login: async function(body) {
        const { email, password } = body;

        if (!email || !password) {
            return {
                errors: {
                    status: 401,
                    source: "/login",
                    title: "Email or password missing",
                    detail: "Email or password missing in request"
                }
            };
        }

        try {
            const user = await UserModel.findOne({ email: email.toLowerCase() });

            if (!user) {
                return {
                    errors: {
                        status: 401,
                        source: "/login",
                        title: "User not found",
                        detail: "User with provided email not found."
                    }
                };
            }

            const isPasswordCorrect = await bcrypt.compare(password, user.password);

            if (!isPasswordCorrect) {
                return {
                    errors: {
                        status: 401,
                        source: "/login",
                        title: "Wrong password",
                        detail: "Password is incorrect."
                    }
                };
            }

            // Generate JWT
            const token = jwt.sign({ email: user.email, id: user._id }, jwtSecret, { expiresIn: '1d' });

            return {
                data: {
                    message: "Login successful",
                    user: { email: user.email, username: user.username },
                    token,
                }
            };

        } catch (e) {
            return {
                errors: {
                    status: 500,
                    source: "/login",
                    title: "Database error",
                    detail: e.message
                }
            };
        }
    },
};

export default auth;
