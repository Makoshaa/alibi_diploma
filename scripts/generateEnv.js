const fs = require('fs');
const path = require('path');
const { getLocalIpAddress, getAllLocalIpAddresses } = require('../server/utils/networkUtils');

/**
 * Генерирует .env.local файл с актуальным локальным IP
 */
function generateEnvLocal() {
  const localIp = getLocalIpAddress();
  const allAddresses = getAllLocalIpAddresses();
  
  const envContent = `# Локальная конфигурация для работы в сети с HTTPS
# Автоматически сгенерировано скриптом generateEnv.js
# IP адрес: ${localIp}

VITE_API_BASE_URL=https://${localIp}:5000/api
VITE_APP_URL=https://${localIp}:5173
`;

  const envPath = path.resolve(__dirname, '../.env.local');
  
  fs.writeFileSync(envPath, envContent, 'utf8');
  
  console.log('✅ Файл .env.local успешно обновлен');
  console.log(`📍 Выбранный IP адрес: ${localIp}`);
  
  if (allAddresses.length > 1) {
    console.log('\n📋 Найденные сетевые адаптеры (исключая виртуальные):');
    allAddresses.forEach(addr => {
      const isCurrent = addr.address === localIp;
      console.log(`   ${isCurrent ? '✓' : ' '} ${addr.name}: ${addr.address}`);
    });
  }
  
  console.log(`\n🌐 API URL: https://${localIp}:5000/api`);
  console.log(`🌐 App URL: https://${localIp}:5173`);
  console.log('\n📱 Для подключения с мобильных устройств:');
  console.log(`   Откройте https://${localIp}:5173 в браузере`);
  console.log('   (убедитесь, что устройство подключено к той же Wi-Fi сети)');
}

// Запуск генерации
try {
  generateEnvLocal();
} catch (error) {
  console.error('❌ Ошибка при генерации .env.local:', error.message);
  process.exit(1);
}
