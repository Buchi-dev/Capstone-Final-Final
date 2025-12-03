/**
 * Query Builder Service
 * 
 * Provides reusable utilities for building MongoDB queries with:
 * - Pagination
 * - Filtering
 * - Sorting
 * - Population
 * 
 * Eliminates code duplication across controllers
 * 
 * @module utils/queryBuilder
 */

const logger = require('./logger');

/**
 * Build pagination parameters
 * @param {Object} query - Request query parameters
 * @param {number} defaultLimit - Default items per page
 * @returns {Object} Pagination parameters
 */
function buildPagination(query, defaultLimit = 50) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || defaultLimit));
  const skip = (page - 1) * limit;

  return {
    page,
    limit,
    skip,
  };
}

/**
 * Build sort parameters
 * @param {Object} query - Request query parameters
 * @param {string} defaultSort - Default sort field (e.g., '-createdAt')
 * @returns {Object} Sort object for MongoDB
 */
function buildSort(query, defaultSort = '-createdAt') {
  const sortBy = query.sortBy || defaultSort;
  
  // Handle sorting with direction
  // Format: '-field' for descending, 'field' for ascending
  const sortObj = {};
  const fields = sortBy.split(',');
  
  fields.forEach(field => {
    const trimmed = field.trim();
    if (trimmed.startsWith('-')) {
      sortObj[trimmed.substring(1)] = -1;
    } else {
      sortObj[trimmed] = 1;
    }
  });

  return sortObj;
}

/**
 * Build date range filter
 * @param {Object} query - Request query parameters
 * @param {string} field - Field name to filter (default: 'createdAt')
 * @returns {Object} Date range filter or empty object
 */
function buildDateRangeFilter(query, field = 'createdAt') {
  const { startDate, endDate } = query;
  
  if (!startDate && !endDate) {
    return {};
  }

  const filter = {};
  
  if (startDate) {
    filter.$gte = new Date(startDate);
  }
  
  if (endDate) {
    const end = new Date(endDate);
    // Set to end of day if only date is provided (no time)
    if (!endDate.includes('T')) {
      end.setHours(23, 59, 59, 999);
    }
    filter.$lte = end;
  }

  return filter.$gte || filter.$lte ? { [field]: filter } : {};
}

/**
 * Build filter object from query parameters
 * @param {Object} query - Request query parameters
 * @param {Array} allowedFilters - Array of allowed filter field names
 * @returns {Object} MongoDB filter object
 */
function buildFilter(query, allowedFilters = []) {
  const filter = {};
  
  allowedFilters.forEach(field => {
    if (query[field] !== undefined && query[field] !== '') {
      // Handle array values (e.g., status=active,inactive)
      if (typeof query[field] === 'string' && query[field].includes(',')) {
        filter[field] = { $in: query[field].split(',').map(v => v.trim()) };
      } else {
        filter[field] = query[field];
      }
    }
  });

  return filter;
}

/**
 * Execute paginated query with consistent format
 * @param {Object} Model - Mongoose model
 * @param {Object} options - Query options
 * @param {Object} options.filter - MongoDB filter object
 * @param {Object} options.sort - MongoDB sort object
 * @param {number} options.page - Page number
 * @param {number} options.limit - Items per page
 * @param {number} options.skip - Items to skip
 * @param {string|Object} options.populate - Population configuration
 * @param {string} options.select - Fields to select
 * @param {boolean} options.lean - Use lean() for better performance
 * @returns {Promise<Object>} Results with data and pagination
 */
async function executePaginatedQuery(Model, options = {}) {
  const {
    filter = {},
    sort = { createdAt: -1 },
    page = 1,
    limit = 50,
    skip = 0,
    populate = null,
    select = '',
    lean = true,
  } = options;

  try {
    // Build query
    let query = Model.find(filter);

    // Apply select
    if (select) {
      query = query.select(select);
    }

    // Apply populate
    if (populate) {
      if (Array.isArray(populate)) {
        populate.forEach(pop => query = query.populate(pop));
      } else {
        query = query.populate(populate);
      }
    }

    // Apply sorting, pagination, and lean
    query = query
      .sort(sort)
      .limit(limit)
      .skip(skip);

    if (lean) {
      query = query.lean();
    }

    // Execute query and count in parallel
    const [data, total] = await Promise.all([
      query.exec(),
      Model.countDocuments(filter),
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
    };
  } catch (error) {
    logger.error('[Query Builder] Error executing paginated query:', {
      error: error.message,
      model: Model.modelName,
      filter,
    });
    throw error;
  }
}

/**
 * Execute aggregation pipeline with pagination
 * @param {Object} Model - Mongoose model
 * @param {Array} pipeline - Aggregation pipeline stages
 * @param {Object} options - Pagination options
 * @returns {Promise<Object>} Results with data and pagination
 */
async function executePaginatedAggregation(Model, pipeline = [], options = {}) {
  const {
    page = 1,
    limit = 50,
    skip = 0,
  } = options;

  try {
    // Clone pipeline to avoid mutation
    const countPipeline = [...pipeline];
    const dataPipeline = [...pipeline];

    // Add pagination stages to data pipeline
    dataPipeline.push(
      { $skip: skip },
      { $limit: limit }
    );

    // Add count stage to count pipeline
    countPipeline.push(
      { $count: 'total' }
    );

    // Execute both pipelines in parallel
    const [dataResult, countResult] = await Promise.all([
      Model.aggregate(dataPipeline).exec(),
      Model.aggregate(countPipeline).exec(),
    ]);

    const total = countResult[0]?.total || 0;

    return {
      data: dataResult,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
    };
  } catch (error) {
    logger.error('[Query Builder] Error executing paginated aggregation:', {
      error: error.message,
      model: Model.modelName,
    });
    throw error;
  }
}

/**
 * Search text across multiple fields
 * @param {Array} fields - Fields to search
 * @param {string} searchTerm - Search term
 * @returns {Object} MongoDB $or filter
 */
function buildTextSearch(fields, searchTerm) {
  if (!searchTerm || !fields || fields.length === 0) {
    return {};
  }

  const regex = new RegExp(searchTerm.trim(), 'i');
  
  return {
    $or: fields.map(field => ({
      [field]: regex,
    })),
  };
}

/**
 * All-in-one query builder
 * Combines filtering, sorting, pagination, and execution
 * @param {Object} Model - Mongoose model
 * @param {Object} query - Request query parameters
 * @param {Object} config - Configuration options
 * @returns {Promise<Object>} Results with data and pagination
 */
async function buildAndExecuteQuery(Model, query, config = {}) {
  const {
    allowedFilters = [],
    defaultSort = '-createdAt',
    defaultLimit = 50,
    populate = null,
    select = '',
    lean = true,
    dateField = 'createdAt',
    searchFields = [],
  } = config;

  // Build components
  const pagination = buildPagination(query, defaultLimit);
  const sort = buildSort(query, defaultSort);
  const filter = buildFilter(query, allowedFilters);
  const dateFilter = buildDateRangeFilter(query, dateField);
  const searchFilter = query.search ? buildTextSearch(searchFields, query.search) : {};

  // Combine filters
  const combinedFilter = {
    ...filter,
    ...dateFilter,
    ...searchFilter,
  };

  // Execute query
  return executePaginatedQuery(Model, {
    filter: combinedFilter,
    sort,
    ...pagination,
    populate,
    select,
    lean,
  });
}

module.exports = {
  buildPagination,
  buildSort,
  buildDateRangeFilter,
  buildFilter,
  buildTextSearch,
  executePaginatedQuery,
  executePaginatedAggregation,
  buildAndExecuteQuery,
};
