import mongoose, { connect } from "mongoose";
import connectDB from "./database/database";
import dotenv from "dotenv";

dotenv.config({
    path: "./env",
});

/*import express from "express";
const app = express();
(async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`);
        app.on("ERROR: ", (error) => {
            console.error("ERROR", error);
            throw error;
        });

        app.listen(process.env.PORT, () => {
            console.log(`App is listening on port: ${process.env.PORT}`);
        });
    } catch (error) {
        console.error("Error connectin to the database", error);
        throw error;
    }
})();
*/
