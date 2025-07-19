import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    await mongoose.connect('mongodb+srv://vareesha:vareesha@cluster1.jbcfpvt.mongodb.net/', {
  ssl: true,

  tlsAllowInvalidCertificates: true, // optional, for local dev
});

    console.log("DB Connected");
  } catch (error) {
    console.error("Error connecting to DB:", error);
  }
};
