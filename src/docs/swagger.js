import swaggerJsdoc from 'swagger-jsdoc';
import { config } from '../config/index.js';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Maintenance API',
      version: '1.0.0',
      description: 'REST API для учёта заявок на обслуживание оборудования',
    },
    servers: [
      { url: '/api', description: 'Main API' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
                requestId: { type: 'string' },
                details: { type: 'array', items: { type: 'object' } },
              },
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.routes.js'], // читаем JSDoc-комментарии
};

export const swaggerSpec = swaggerJsdoc(options);