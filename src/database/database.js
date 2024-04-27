import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(
            `${process.env.MONGODB_URL}/ ${DB_NAME}`
        );
        console.log(
            `\n MongoDB conntected!! DB HOST: ${connectionInstance.connection.host}`
        );
    } catch (error) {
        console.error("ERROR: ", error);
    }
};

export default connectDB;
