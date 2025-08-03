import mongoose from "mongoose";

const estimatePlanSchema = new mongoose.Schema({
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    name: {
        type: String,
        required: [true, 'Plan name is required'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    timeline: {
        type: String,
        required: [true, 'Timeline is required']
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: [0, 'Price cannot be negative']
    },
    features: [{
        type: String,
        trim: true
    }],
    techStack: [{
        type: String,
        trim: true
    }],
    isSelected: {
        type: Boolean,
        default: false
    }
}, { _id: true });
const Estimate = mongoose.model('Estimate', estimatePlanSchema);
export default Estimate;