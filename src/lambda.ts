import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import express from 'express';
import serverlessExpress from '@vendia/serverless-express';

let cachedServer;

async function createServer () {
  if (!cachedServer) {
    try {
      console.log('Starting NestJS application...');
      console.log('Environment variables:', {
        DB_HOST: process.env.DB_HOST,
        DB_PORT: process.env.DB_PORT,
        DB_NAME: process.env.DB_NAME,
        DB_USERNAME: process.env.DB_USERNAME,
        NODE_ENV: process.env.NODE_ENV,
      });

      const expressApp = express();
      const app = await NestFactory.create(
        AppModule,
        new ExpressAdapter(expressApp),
        { logger: ['error', 'warn', 'log'] },
      );
      app.enableCors();
      await app.init();

      console.log('NestJS application initialized successfully');
      cachedServer = serverlessExpress({ app: expressApp });
    } catch (error) {
      console.error('Failed to bootstrap NestJS application:', error);
      throw error;
    }
  }
  return cachedServer;
}

export const handler = async (event: any, context: any) => {
  // Prevent Lambda from waiting for event loop to be empty
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    const server = await createServer();
    return server(event, context);
  } catch (error) {
    console.error('Lambda handler error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Internal Server Error',
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      }),
    };
  }
};
