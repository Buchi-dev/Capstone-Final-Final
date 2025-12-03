# Query Builder & CRUD Operations Guide

A powerful, type-safe Query Builder and CRUD Operations utility for MongoDB with TypeScript.

## 📚 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Query Builder Usage](#query-builder-usage)
- [CRUD Operations Usage](#crud-operations-usage)
- [Advanced Examples](#advanced-examples)
- [API Reference](#api-reference)

## 🎯 Overview

The Query Builder provides a fluent interface for building complex MongoDB queries with pagination, filtering, sorting, and more. The CRUD Operations class provides standard database operations with proper error handling.

## ✨ Features

- ✅ **Type-Safe**: Full TypeScript support with generics
- 🔍 **Advanced Filtering**: Support for search, date ranges, numeric ranges, and more
- 📄 **Pagination**: Built-in pagination with metadata
- 🔀 **Sorting**: Flexible sorting options
- 🎯 **Field Selection**: Select specific fields to return
- 🔗 **Population**: Support for Mongoose populate
- 🛠️ **CRUD Operations**: Complete Create, Read, Update, Delete operations
- 📊 **Query Statistics**: Count, exists, and aggregation support

## 📦 Installation

The Query Builder is already included in your project. Import it from utils:

```typescript
import { QueryBuilder, CRUDOperations } from '@utils/queryBuilder.util';
```

## 🔍 Query Builder Usage

### Basic Usage

```typescript
import { QueryBuilder } from '@utils/queryBuilder.util';
import { MyModel, IMyDocument } from './my.model';

// Create a new query builder
const queryBuilder = new QueryBuilder<IMyDocument>(MyModel);

// Execute with pagination
const result = await queryBuilder
  .filter({ status: 'active' })
  .paginate(1, 10)
  .sortBy('-createdAt')
  .execute();

console.log(result.data); // Array of documents
console.log(result.pagination); // Pagination metadata
```

### Pagination

```typescript
const result = await queryBuilder
  .paginate(2, 20) // Page 2, 20 items per page
  .execute();

// Result includes pagination metadata
console.log(result.pagination);
// {
//   page: 2,
//   limit: 20,
//   total: 150,
//   totalPages: 8,
//   hasNextPage: true,
//   hasPrevPage: true
// }
```

### Filtering

```typescript
// Simple filter
await queryBuilder
  .filter({ status: 'active', verified: true })
  .execute();

// Multiple filters can be chained
await queryBuilder
  .filter({ status: 'active' })
  .filter({ verified: true })
  .execute();
```

### Search

```typescript
// Case-insensitive search across multiple fields
await queryBuilder
  .search(['name', 'description', 'email'], 'john')
  .execute();
```

### Date Range Filtering

```typescript
const startDate = new Date('2025-01-01');
const endDate = new Date('2025-12-31');

await queryBuilder
  .dateRange('createdAt', startDate, endDate)
  .execute();
```

### Numeric Range Filtering

```typescript
// Filter by numeric range
await queryBuilder
  .numericRange('price', 10, 100) // Between $10 and $100
  .execute();

// Min only
await queryBuilder
  .numericRange('age', 18, undefined) // 18 or older
  .execute();

// Max only
await queryBuilder
  .numericRange('score', undefined, 100) // 100 or less
  .execute();
```

### WhereIn Filter

```typescript
// Find documents where field value is in array
await queryBuilder
  .whereIn('category', ['electronics', 'computers', 'phones'])
  .execute();
```

### Sorting

```typescript
// Sort ascending
await queryBuilder.sortBy('name').execute();

// Sort descending (prefix with -)
await queryBuilder.sortBy('-createdAt').execute();

// Multiple sort fields
await queryBuilder.sortBy('status -createdAt').execute();
```

### Field Selection

```typescript
// Select specific fields
await queryBuilder
  .selectFields('name email createdAt')
  .execute();

// Exclude fields (prefix with -)
await queryBuilder
  .selectFields('-password -__v')
  .execute();
```

### Population

```typescript
// Populate single field
await queryBuilder
  .populateFields('author')
  .execute();

// Populate multiple fields
await queryBuilder
  .populateFields(['author', 'category', 'tags'])
  .execute();
```

### Chaining Methods

```typescript
// Combine multiple query operations
const result = await queryBuilder
  .search(['name', 'description'], 'water')
  .filter({ status: 'active' })
  .dateRange('createdAt', startDate, endDate)
  .numericRange('price', 0, 1000)
  .sortBy('-createdAt')
  .paginate(1, 20)
  .selectFields('name price description')
  .populateFields(['category', 'author'])
  .execute();
```

### Execute Methods

```typescript
// Execute with pagination
const result = await queryBuilder.execute();

// Execute without pagination (get all results)
const allResults = await queryBuilder.executeAll();

// Execute and get first result only
const firstResult = await queryBuilder.executeOne();

// Count documents
const count = await queryBuilder.count();

// Check if any documents exist
const exists = await queryBuilder.exists();
```

## 🛠️ CRUD Operations Usage

### Initialize CRUD Operations

```typescript
import { CRUDOperations } from '@utils/queryBuilder.util';
import { MyModel, IMyDocument } from './my.model';

const crud = new CRUDOperations<IMyDocument>(MyModel);
```

### Create Operations

```typescript
// Create single document
const newDoc = await crud.create({
  name: 'John Doe',
  email: 'john@example.com',
  age: 30,
});

// Create multiple documents
const newDocs = await crud.createMany([
  { name: 'John', email: 'john@example.com' },
  { name: 'Jane', email: 'jane@example.com' },
]);
```

### Read Operations

```typescript
// Find by ID
const doc = await crud.findById('507f1f77bcf86cd799439011');

// Find by ID with options
const doc = await crud.findById('507f1f77bcf86cd799439011', {
  populate: 'author',
  select: 'name email',
});

// Find all documents
const allDocs = await crud.findAll();

// Find all with filter
const activeDocs = await crud.findAll({ status: 'active' });

// Find one by filter
const doc = await crud.findOne({ email: 'john@example.com' });

// Find one with options
const doc = await crud.findOne(
  { email: 'john@example.com' },
  { populate: ['profile', 'posts'], select: 'name email' }
);
```

### Update Operations

```typescript
// Update by ID
const updated = await crud.updateById(
  '507f1f77bcf86cd799439011',
  { name: 'John Updated' }
);

// Update by ID with options
const updated = await crud.updateById(
  '507f1f77bcf86cd799439011',
  { name: 'John Updated' },
  { new: true, runValidators: true }
);

// Update one by filter
const updated = await crud.updateOne(
  { email: 'john@example.com' },
  { name: 'John Updated' }
);

// Update many documents
const result = await crud.updateMany(
  { status: 'pending' },
  { status: 'active' }
);
console.log(`Modified: ${result.modifiedCount}, Matched: ${result.matchedCount}`);
```

### Delete Operations

```typescript
// Delete by ID
const deleted = await crud.deleteById('507f1f77bcf86cd799439011');

// Delete one by filter
const deleted = await crud.deleteOne({ email: 'john@example.com' });

// Delete many documents
const result = await crud.deleteMany({ status: 'inactive' });
console.log(`Deleted: ${result.deletedCount} documents`);
```

### Utility Operations

```typescript
// Check if document exists by ID
const exists = await crud.existsById('507f1f77bcf86cd799439011');

// Check if document exists by filter
const exists = await crud.exists({ email: 'john@example.com' });

// Count documents
const total = await crud.count();
const activeCount = await crud.count({ status: 'active' });

// Get query builder
const queryBuilder = crud.query();
```

## 🚀 Advanced Examples

### Service Layer Pattern

```typescript
import { CRUDOperations, QueryBuilderOptions } from '@utils/queryBuilder.util';
import { UserModel, IUserDocument } from './user.model';

export class UserService {
  private crud: CRUDOperations<IUserDocument>;

  constructor() {
    this.crud = new CRUDOperations(UserModel);
  }

  async getUsers(options: QueryBuilderOptions & {
    search?: string;
    role?: string;
    verified?: boolean;
  }) {
    const { page, limit, sort, search, role, verified } = options;

    const query = this.crud.query();

    if (search) {
      query.search(['name', 'email', 'username'], search);
    }

    const filters: any = {};
    if (role) filters.role = role;
    if (verified !== undefined) filters.verified = verified;
    query.filter(filters);

    return await query
      .paginate(page, limit)
      .sortBy(sort || '-createdAt')
      .execute();
  }

  async getUserById(id: string) {
    return await this.crud.findById(id, {
      populate: ['profile', 'posts'],
      select: '-password',
    });
  }

  async createUser(data: Partial<IUserDocument>) {
    return await this.crud.create(data);
  }

  async updateUser(id: string, data: Partial<IUserDocument>) {
    return await this.crud.updateById(id, data);
  }

  async deleteUser(id: string) {
    return await this.crud.deleteById(id);
  }

  async getUserStats() {
    const total = await this.crud.count();
    const verified = await this.crud.count({ verified: true });
    const unverified = await this.crud.count({ verified: false });

    return { total, verified, unverified };
  }
}
```

### Complex Query Example

```typescript
// Complex query with multiple filters
const result = await crud.query()
  // Text search
  .search(['name', 'description'], 'water quality')
  
  // Status filter
  .filter({ 
    status: 'active',
    verified: true,
  })
  
  // Date range (last 30 days)
  .dateRange(
    'createdAt',
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    new Date()
  )
  
  // Numeric range
  .numericRange('rating', 4, 5)
  
  // Category filter
  .whereIn('category', ['sensors', 'monitoring', 'devices'])
  
  // Sorting
  .sortBy('-rating -createdAt')
  
  // Pagination
  .paginate(1, 20)
  
  // Field selection
  .selectFields('name description rating createdAt category')
  
  // Populate relationships
  .populateFields(['author', 'comments'])
  
  // Execute
  .execute();
```

### Bulk Operations Example

```typescript
// Bulk update
const bulkUpdate = async (ids: string[], data: any) => {
  return await crud.updateMany(
    { _id: { $in: ids } },
    data
  );
};

// Bulk delete
const bulkDelete = async (ids: string[]) => {
  return await crud.deleteMany({ _id: { $in: ids } });
};

// Bulk activate
const bulkActivate = async (ids: string[]) => {
  return await crud.updateMany(
    { _id: { $in: ids } },
    { status: 'active', activatedAt: new Date() }
  );
};
```

## 📖 API Reference

### QueryBuilder Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `filter()` | `FilterQuery<T>` | `this` | Add filter conditions |
| `search()` | `fields: string[], searchTerm: string` | `this` | Case-insensitive search |
| `paginate()` | `page?: number, limit?: number` | `this` | Set pagination |
| `sortBy()` | `sort?: string` | `this` | Set sorting |
| `selectFields()` | `fields?: string` | `this` | Select specific fields |
| `populateFields()` | `populate?: string \| string[]` | `this` | Populate relations |
| `dateRange()` | `field: string, start?: Date, end?: Date` | `this` | Date range filter |
| `numericRange()` | `field: string, min?: number, max?: number` | `this` | Numeric range filter |
| `whereIn()` | `field: string, values: any[]` | `this` | In array filter |
| `execute()` | - | `Promise<QueryResult<T>>` | Execute with pagination |
| `executeAll()` | - | `Promise<T[]>` | Execute without pagination |
| `executeOne()` | - | `Promise<T \| null>` | Get first result |
| `count()` | - | `Promise<number>` | Count documents |
| `exists()` | - | `Promise<boolean>` | Check if exists |

### CRUDOperations Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `create()` | `data: Partial<T>` | `Promise<T>` | Create document |
| `createMany()` | `data: Partial<T>[]` | `Promise<T[]>` | Create multiple |
| `findById()` | `id: string, options?` | `Promise<T \| null>` | Find by ID |
| `findAll()` | `filter?, options?` | `Promise<T[]>` | Find all |
| `findOne()` | `filter, options?` | `Promise<T \| null>` | Find one |
| `updateById()` | `id: string, data, options?` | `Promise<T \| null>` | Update by ID |
| `updateOne()` | `filter, data, options?` | `Promise<T \| null>` | Update one |
| `updateMany()` | `filter, data` | `Promise<UpdateResult>` | Update many |
| `deleteById()` | `id: string` | `Promise<T \| null>` | Delete by ID |
| `deleteOne()` | `filter` | `Promise<T \| null>` | Delete one |
| `deleteMany()` | `filter` | `Promise<DeleteResult>` | Delete many |
| `existsById()` | `id: string` | `Promise<boolean>` | Check if exists |
| `exists()` | `filter` | `Promise<boolean>` | Check if exists |
| `count()` | `filter?` | `Promise<number>` | Count documents |
| `query()` | - | `QueryBuilder<T>` | Get query builder |

## 💡 Best Practices

1. **Use Services**: Wrap CRUD operations in service classes
2. **Type Safety**: Always use TypeScript interfaces for your models
3. **Pagination**: Always use pagination for list endpoints
4. **Field Selection**: Only return necessary fields
5. **Error Handling**: Handle errors in service layer
6. **Validation**: Validate input before database operations
7. **Indexing**: Create indexes for frequently filtered fields
8. **Population**: Be careful with circular references

## 🎓 Tips

- Chain methods for cleaner code
- Use `executeAll()` sparingly to avoid memory issues
- Implement caching for frequently accessed data
- Use indexes for fields used in filters and sorting
- Test queries with small datasets first
- Monitor query performance in production

## ✨ Examples in Action

Check out the example service at `src/feature/examples/example.service.ts` for a complete implementation!

---

Happy Querying! 🚀
