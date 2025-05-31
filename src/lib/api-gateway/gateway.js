import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { metricsCollector } from '../metricsCollector';

const apiGateway = express();

// Security middleware
apiGateway.use(helmet());
apiGateway.use(express.json({ limit: '10kb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
});

// Service routing
apiGateway.use('/auth', limiter, (req, res) => serviceProxy('auth-service', req, res));
apiGateway.use('/inventory', limiter, (req, res) => serviceProxy('inventory-service', req, res));
apiGateway.use('/monitoring', limiter, (req, res) => serviceProxy('monitoring-service', req, res));

// Service discovery proxy
const serviceProxy = (serviceName, req, res) => {
  const start = Date.now();
  
  metricsCollector.trackRequest(serviceName, req.method);
  
  // Implement actual service discovery logic
  console.log(`Routing to ${serviceName}`, req.path);
  
  const duration = Date.now() - start;
  metricsCollector.trackLatency(serviceName, duration);
};

// Health check endpoint
apiGateway.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    version: process.env.npm_package_version,
    uptime: process.uptime()
  });
});

export default apiGateway;