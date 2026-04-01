import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    const analyses = await db.collection("analyses").find().sort({_id: -1}).limit(1).toArray();
    if(analyses.length > 0) {
      console.log(JSON.stringify(analyses[0].result.recommendations, null, 2));
    } else {
      console.log("No analyses found.");
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}
run();
