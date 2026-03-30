const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  // The person writing the review
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // The person receiving the review (Vendor or Recipient)
  reviewee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // The specific food listing this review is about
  listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
  
  // The Rating System (1 to 5 stars)
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String },
  
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Review', reviewSchema);