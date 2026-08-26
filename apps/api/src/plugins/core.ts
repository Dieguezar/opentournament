import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import type { FastifyError, FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { env } from '../config.js';

export async function registerCorePlugins(app: FastifyInstance): Promise<void> {
  // Parser JSON que conserva el cuerpo crudo (necesario para verificar
  // firmas de Discord sobre el payload exacto).
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (request, body, done) => {
    try {
      request.rawBody = body as string;
      done(null, body ? JSON.parse(body as string) : {});
    } catch (error) {
      done(error as Error);
    }
  });

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
      },
    },
  });

  await app.register(cors, {
    origin: env.NODE_ENV === 'development' ? true : env.APP_URL,
    credentials: true,
  });

  await app.register(rateLimit, {
    global: true,
    max: env.RATE_LIMIT_GLOBAL_PER_MIN,
    timeWindow: '1 minute',
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'OpenTournament API',
        description: 'API de la plataforma open source de torneos de esports.',
        version: '0.1.0',
      },
      servers: [{ url: env.API_URL }],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
  });

  app.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error({ err: error }, 'error en request');

    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Datos de entrada inválidos',
          details: error.flatten().fieldErrors,
        },
      });
    }

    const statusCode = error.statusCode ?? 500;
    return reply.status(statusCode).send({
      error: {
        code: error.code ?? 'INTERNAL_ERROR',
        message: statusCode === 500 ? 'Error interno del servidor' : error.message,
      },
    });
  });
}
