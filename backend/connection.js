import mongoose from 'mongoose';


const connectToDb = async () => {
  try {
    const uri = process.env.MONGODB_URI ;
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