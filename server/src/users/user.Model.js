const mongoose = require('mongoose');

/**
 * User Schema for storing user information
 * Supports both Google OAuth and traditional authentication
 */
const userSchema = new mongoose.Schema(
  {
    googleId: {
      type: String,
      unique: true,
      sparse: true, // Allows null values but enforces uniqueness when present
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    displayName: {
      type: String,
      required: true,
    },
    firstName: {
      type: String,
    },
    lastName: {
      type: String,
    },
    profilePicture: {
      type: String,
    },
    role: {
      type: String,
      enum: ['admin', 'staff', 'user'],
      default: 'user',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },
    provider: {
      type: String,
      enum: ['google', 'local'],
      default: 'google',
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

/**
 * Create indexes for better query performance
 */
userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 });
userSchema.index({ role: 1, status: 1 });

/**
 * Instance method to get public profile
 */
userSchema.methods.toPublicProfile = function () {
  return {
    id: this._id,
    email: this.email,
    displayName: this.displayName,
    firstName: this.firstName,
    lastName: this.lastName,
    profilePicture: this.profilePicture,
    role: this.role,
    status: this.status,
  };
};

const User = mongoose.model('User', userSchema);

module.exports = User;
