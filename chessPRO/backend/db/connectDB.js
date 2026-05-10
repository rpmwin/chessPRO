import mongoose from "mongoose";

const connectdb = async () => {
    try {
        const conn = await mongoose.connect(`${process.env.MONGO_URI}/chessPRO`);
        console.log("mongo db connection was successfull !! ");
    } catch (error) {
        console.log(`some error occured in mongodb connection: ${error}`);
    }
};

export default connectdb;
