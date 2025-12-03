# Water Quality Monitoring Server v2 (TypeScript)

A modern, type-safe backend server built with TypeScript, Express, and MongoDB for the Water Quality Monitoring System.

## 🚀 Features

- ✅ **Full TypeScript Support** with strict type checking
- 🏗️ **Modular Architecture** with clean separation of concerns
- 🔒 **Type-Safe** error handling and validation
- 📝 **Request Logging** middleware
- 🎯 **Path Aliases** for cleaner imports
- 🔄 **Hot Reload** with nodemon during development
- 🗄️ **MongoDB** integration with Mongoose
- 🌐 **CORS** configured for cross-origin requests
- 📦 **Singleton Pattern** for database connection

## 📁 Project Structure

```
server_v2/
├── src/
│   ├── index.ts                    # Application entry point
│   ├── core/                       # Core functionality
│   │   ├── configs/                # Configuration files
│   │   │   ├── app.config.ts       # Application configuration
│   │   │   ├── database.config.ts  # Database connection
│   │   │   └── index.ts
│   │   └── middlewares/            # Express middlewares
│   │       ├── errorHandler.middleware.ts
│   │       ├── logger.middleware.ts
│   │       ├── validation.middleware.ts
│   │       └── index.ts
│   ├── feature/                    # Feature modules (routes/controllers)
│   │   ├── example.controller.ts
│   │   └── example.routes.ts
│   └── utils/                      # Utility functions
│       ├── errors.util.ts          # Custom error classes
│       ├── response.util.ts        # Response handler
│       ├── asyncHandler.util.ts    # Async wrapper
│       └── index.ts
├── dist/                           # Compiled JavaScript (auto-generated)
├── .env                            # Environment variables (create from .env.example)
├── .env.example                    # Environment variables template
├── tsconfig.json                   # TypeScript configuration
├── nodemon.json                    # Nodemon configuration
└── package.json                    # Dependencies and scripts
```

## 🛠️ Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create environment file:**
   ```bash
   copy .env.example .env
   ```

3. **Configure your environment variables in `.env`**

## 🏃 Running the Server

### Development Mode (with hot reload)
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

### Other Commands
```bash
npm run type-check    # Check TypeScript types without compiling
npm run clean         # Remove dist folder
npm run build         # Compile TypeScript to JavaScript
```

## 🔧 Configuration

### Path Aliases

The following path aliases are configured in `tsconfig.json`:

- `@core/*` → `src/core/*`
- `@feature/*` → `src/feature/*`
- `@utils/*` → `src/utils/*`

**Example usage:**
```typescript
import { appConfig } from '@core/configs';
import { ResponseHandler } from '@utils/response.util';
```

### Environment Variables

See `.env.example` for required environment variables:

- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)
- `MONGODB_URI` - MongoDB connection string
- `CORS_ORIGIN` - Allowed CORS origins

## 📝 Adding New Features

### 1. Create a Controller

```typescript
// src/feature/myfeature.controller.ts
import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '@utils/asyncHandler.util';
import ResponseHandler from '@utils/response.util';

export class MyFeatureController {
  static getAll = asyncHandler(async (_req: Request, res: Response, _next: NextFunction) => {
    const data = { /* your data */ };
    ResponseHandler.success(res, data, 'Success message');
  });
}
```

### 2. Create Routes

```typescript
// src/feature/myfeature.routes.ts
import { Router } from 'express';
import MyFeatureController from './myfeature.controller';

const router = Router();
router.get('/', MyFeatureController.getAll);

export default router;
```

### 3. Register Routes in `src/index.ts`

```typescript
import myFeatureRoutes from '@feature/myfeature.routes';
app.use('/api/myfeature', myFeatureRoutes);
```

## 🔐 Error Handling

Custom error classes are available:

```typescript
import { NotFoundError, BadRequestError, UnauthorizedError } from '@utils/errors.util';

throw new NotFoundError('Resource not found');
throw new BadRequestError('Invalid input');
throw new UnauthorizedError('Access denied');
```

## 🧪 Type Safety

All code is strictly typed with TypeScript. The `tsconfig.json` is configured with:

- Strict mode enabled
- No implicit any
- Unused locals/parameters detection
- Strict null checks

## 📊 API Endpoints

### Health Check
- **GET** `/health` - Check server status

### API Info
- **GET** `/api` - Get API information

### Example Endpoints
- **GET** `/api/examples` - Get all examples
- **GET** `/api/examples/:id` - Get example by ID
- **POST** `/api/examples` - Create new example
- **PUT** `/api/examples/:id` - Update example
- **DELETE** `/api/examples/:id` - Delete example

## 🤝 Contributing

When adding new features:

1. Follow the existing folder structure
2. Use TypeScript strict typing
3. Use path aliases for imports
4. Wrap async handlers with `asyncHandler`
5. Use `ResponseHandler` for consistent responses
6. Create custom errors for specific scenarios

## 📚 Technologies

- **TypeScript** - Type-safe JavaScript
- **Express** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **Zod** - Schema validation
- **Nodemon** - Development hot reload
- **ts-node** - TypeScript execution

## 📄 License

ISC
