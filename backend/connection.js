import mongoose from 'mongoose';

 
const connectToDb = async (uri) => {
  try {
   console.log("Connecting to MongoDB at:", uri);
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
}
export { connectToDb };