// This file sets up the Prisma client for database interactions. It ensures that a single instance of the Prisma client is used throughout the application, which is important for performance and to avoid issues with multiple instances in development environments.

import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const db = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db

