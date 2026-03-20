module.exports = {
  apps: [
    {
      name: 'madhyamgram-rabindra-academy-api',
      script: 'npm',
      args: 'start',
      cwd: './server',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    }
  ]
};
