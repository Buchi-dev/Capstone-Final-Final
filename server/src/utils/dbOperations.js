/**
 * Database Operations Utility
 * 
 * Provides reusable patterns for common database operations:
 * - Find by ID with error handling
 * - Update with validation
 * - Bulk operations
 * - Atomic updates
 * 
 * Reduces boilerplate and ensures consistency
 * 
 * @module utils/dbOperations
 */

const { NotFoundError, ValidationError } = require('../errors');
const logger = require('./logger');

/**
 * Find document by ID with error handling
 * @param {Object} Model - Mongoose model
 * @param {string} id - Document ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Document
 * @throws {NotFoundError} If document not found
 */
async function findByIdOrFail(Model, id, options = {}) {
  const {
    populate = null,
    select = '',
    lean = false,
  } = options;

  try {
    let query = Model.findById(id);

    if (select) query = query.select(select);
    if (populate) query = query.populate(populate);
    if (lean) query = query.lean();

    const document = await query.exec();

    if (!document) {
      throw new NotFoundError(Model.modelName, id);
    }

    return document;
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    
    logger.error('[DB Operations] Error finding document by ID:', {
      model: Model.modelName,
      id,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Find one document with custom filter
 * @param {Object} Model - Mongoose model
 * @param {Object} filter - MongoDB filter
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Document
 * @throws {NotFoundError} If document not found
 */
async function findOneOrFail(Model, filter, options = {}) {
  const {
    populate = null,
    select = '',
    lean = false,
    errorMessage = null,
  } = options;

  try {
    let query = Model.findOne(filter);

    if (select) query = query.select(select);
    if (populate) query = query.populate(populate);
    if (lean) query = query.lean();

    const document = await query.exec();

    if (!document) {
      const identifier = filter.deviceId || filter.email || JSON.stringify(filter);
      throw new NotFoundError(Model.modelName, identifier, errorMessage);
    }

    return document;
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    
    logger.error('[DB Operations] Error finding document:', {
      model: Model.modelName,
      filter,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Update document by ID with validation
 * @param {Object} Model - Mongoose model
 * @param {string} id - Document ID
 * @param {Object} updates - Fields to update
 * @param {Object} options - Update options
 * @returns {Promise<Object>} Updated document
 */
async function updateByIdOrFail(Model, id, updates, options = {}) {
  const {
    runValidators = true,
    new: returnNew = true,
    populate = null,
    select = '',
  } = options;

  if (Object.keys(updates).length === 0) {
    throw new ValidationError('No fields provided for update');
  }

  try {
    let query = Model.findByIdAndUpdate(
      id,
      updates,
      { runValidators, new: returnNew }
    );

    if (select) query = query.select(select);
    if (populate) query = query.populate(populate);

    const document = await query.exec();

    if (!document) {
      throw new NotFoundError(Model.modelName, id);
    }

    logger.debug('[DB Operations] Document updated:', {
      model: Model.modelName,
      id,
      updatedFields: Object.keys(updates),
    });

    return document;
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }
    
    logger.error('[DB Operations] Error updating document:', {
      model: Model.modelName,
      id,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Update one document with custom filter
 * @param {Object} Model - Mongoose model
 * @param {Object} filter - MongoDB filter
 * @param {Object} updates - Fields to update
 * @param {Object} options - Update options
 * @returns {Promise<Object>} Updated document
 */
async function updateOneOrFail(Model, filter, updates, options = {}) {
  const {
    runValidators = true,
    new: returnNew = true,
    populate = null,
    select = '',
  } = options;

  if (Object.keys(updates).length === 0) {
    throw new ValidationError('No fields provided for update');
  }

  try {
    let query = Model.findOneAndUpdate(
      filter,
      updates,
      { runValidators, new: returnNew }
    );

    if (select) query = query.select(select);
    if (populate) query = query.populate(populate);

    const document = await query.exec();

    if (!document) {
      const identifier = filter.deviceId || filter.email || JSON.stringify(filter);
      throw new NotFoundError(Model.modelName, identifier);
    }

    logger.debug('[DB Operations] Document updated:', {
      model: Model.modelName,
      filter,
      updatedFields: Object.keys(updates),
    });

    return document;
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }
    
    logger.error('[DB Operations] Error updating document:', {
      model: Model.modelName,
      filter,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Delete document by ID
 * @param {Object} Model - Mongoose model
 * @param {string} id - Document ID
 * @returns {Promise<Object>} Deleted document
 */
async function deleteByIdOrFail(Model, id) {
  try {
    const document = await Model.findByIdAndDelete(id);

    if (!document) {
      throw new NotFoundError(Model.modelName, id);
    }

    logger.info('[DB Operations] Document deleted:', {
      model: Model.modelName,
      id,
    });

    return document;
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    
    logger.error('[DB Operations] Error deleting document:', {
      model: Model.modelName,
      id,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Bulk update documents
 * @param {Object} Model - Mongoose model
 * @param {Object} filter - MongoDB filter
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Update result
 */
async function bulkUpdate(Model, filter, updates) {
  try {
    const result = await Model.updateMany(filter, updates);

    logger.info('[DB Operations] Bulk update completed:', {
      model: Model.modelName,
      matched: result.matchedCount,
      modified: result.modifiedCount,
    });

    return result;
  } catch (error) {
    logger.error('[DB Operations] Error in bulk update:', {
      model: Model.modelName,
      filter,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Bulk delete documents
 * @param {Object} Model - Mongoose model
 * @param {Object} filter - MongoDB filter
 * @returns {Promise<Object>} Delete result
 */
async function bulkDelete(Model, filter) {
  try {
    const result = await Model.deleteMany(filter);

    logger.info('[DB Operations] Bulk delete completed:', {
      model: Model.modelName,
      deleted: result.deletedCount,
    });

    return result;
  } catch (error) {
    logger.error('[DB Operations] Error in bulk delete:', {
      model: Model.modelName,
      filter,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Check if document exists
 * @param {Object} Model - Mongoose model
 * @param {Object} filter - MongoDB filter
 * @returns {Promise<boolean>} True if exists
 */
async function exists(Model, filter) {
  try {
    const count = await Model.countDocuments(filter).limit(1);
    return count > 0;
  } catch (error) {
    logger.error('[DB Operations] Error checking existence:', {
      model: Model.modelName,
      filter,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Atomic increment field
 * @param {Object} Model - Mongoose model
 * @param {string} id - Document ID
 * @param {string} field - Field to increment
 * @param {number} amount - Amount to increment (default: 1)
 * @returns {Promise<Object>} Updated document
 */
async function incrementField(Model, id, field, amount = 1) {
  try {
    const document = await Model.findByIdAndUpdate(
      id,
      { $inc: { [field]: amount } },
      { new: true }
    );

    if (!document) {
      throw new NotFoundError(Model.modelName, id);
    }

    return document;
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    
    logger.error('[DB Operations] Error incrementing field:', {
      model: Model.modelName,
      id,
      field,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Add item to array field (atomic)
 * @param {Object} Model - Mongoose model
 * @param {string} id - Document ID
 * @param {string} field - Array field name
 * @param {*} item - Item to add
 * @returns {Promise<Object>} Updated document
 */
async function pushToArray(Model, id, field, item) {
  try {
    const document = await Model.findByIdAndUpdate(
      id,
      { $push: { [field]: item } },
      { new: true }
    );

    if (!document) {
      throw new NotFoundError(Model.modelName, id);
    }

    return document;
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    
    logger.error('[DB Operations] Error pushing to array:', {
      model: Model.modelName,
      id,
      field,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Execute operations in transaction
 * @param {Function} operations - Async function containing operations
 * @returns {Promise<*>} Result of operations
 */
async function executeInTransaction(operations) {
  const mongoose = require('mongoose');
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction();
    
    const result = await operations(session);
    
    await session.commitTransaction();
    
    logger.debug('[DB Operations] Transaction committed successfully');
    
    return result;
  } catch (error) {
    await session.abortTransaction();
    
    logger.error('[DB Operations] Transaction aborted:', {
      error: error.message,
    });
    
    throw error;
  } finally {
    session.endSession();
  }
}

module.exports = {
  findByIdOrFail,
  findOneOrFail,
  updateByIdOrFail,
  updateOneOrFail,
  deleteByIdOrFail,
  bulkUpdate,
  bulkDelete,
  exists,
  incrementField,
  pushToArray,
  executeInTransaction,
};
