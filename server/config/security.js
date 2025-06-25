// Configurações de segurança centralizadas
export const SECURITY_CONFIG = {
  // Limites de pedidos
  MAX_PEDIDO_VALUE: parseFloat(process.env.MAX_PEDIDO_VALUE) || 10000,
  MIN_PEDIDO_ITEMS: parseInt(process.env.MIN_PEDIDO_ITEMS) || 1,
  MAX_PEDIDO_ITEMS: 100,
  
  // Rate limiting
  MAX_REQUESTS_PER_WINDOW: 50,
  RATE_LIMIT_WINDOW_MINUTES: 15,
  
  // Timeouts
  KLEVER_MONITOR_TIMEOUT_MINUTES: 30,
  KLEVER_POLL_INTERVAL_SECONDS: 10,
  
  // Validações
  MAX_STRING_LENGTH: 255,
  MAX_DESCRIPTION_LENGTH: 1000,
  
  // IPs permitidos para webhooks (Asaas)
  ALLOWED_WEBHOOK_IPS: [
    '18.229.220.181',
    '18.231.194.64', 
    '52.67.73.39'
  ],
  
  // Headers de segurança
  SECURITY_HEADERS: {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  }
};

// Função para validar configurações no startup
export function validateSecurityConfig() {
  const requiredEnvVars = [
    'JWT_SECRET',
    'FIREBASE_CONFIG_JSON',
    'access_token'
  ];
  
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    throw new Error(`Variáveis de ambiente obrigatórias ausentes: ${missing.join(', ')}`);
  }
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 16) {
    throw new Error('JWT_SECRET deve ter pelo menos 16 caracteres');
  }
  
  console.log('✅ Configurações de segurança validadas');
}
