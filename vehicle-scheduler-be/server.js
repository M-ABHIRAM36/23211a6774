const app = require('./src/app');

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`  Vehicle Scheduler Backend Running Successfully`);
  console.log(`  Local URL: http://localhost:${PORT}`);
  console.log(`  Target Env: ${process.env.BASE_URL || 'http://4.224.186.213/evaluation-service'}`);
  console.log(`===============================================`);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received. Shutting down gracefully...');
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received. Shutting down gracefully...');
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
});
