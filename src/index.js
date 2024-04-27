import connectDB from "../config/database.js";
import dotenv from "dotenv";
import { app } from "./app.js";

dotenv.config({
    path: "./env",
});

await connectDB()
    .then(() => {
        app.on("ERROR: ", (error) => {
            console.error("Error in connecting to the databae", error);
            throw error;
        });

        app.listen(process.env.PORT || 8000, () => {
            console.log(`Server is running at PORT: ${process.env.PORT}`);
        });
    })
    .catch((error) => {
        console.error("MONGO db connection failed !!!! ", error);
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
