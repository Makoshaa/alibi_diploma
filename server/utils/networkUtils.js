const os = require('os');

/**
 * Проверяет, является ли адаптер виртуальным
 */
function isVirtualAdapter(name) {
  const virtualPatterns = [
    /virtual/i,
    /vethernet/i,
    /wsl/i,
    /hyper-v/i,
    /vmware/i,
    /virtualbox/i,
    /vbox/i,
    /docker/i,
    /loopback/i
  ];
  
  return virtualPatterns.some(pattern => pattern.test(name));
}

/**
 * Получить локальный IP адрес в сети
 * Ищет IPv4 адрес реального сетевого адаптера (исключая виртуальные)
 */
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  const candidates = [];
  
  for (const name of Object.keys(interfaces)) {
    // Пропускаем виртуальные адаптеры
    if (isVirtualAdapter(name)) {
      continue;
    }
    
    for (const iface of interfaces[name]) {
      // Пропускаем внутренние и не-IPv4 адреса
      if (iface.family === 'IPv4' && !iface.internal) {
        candidates.push({
          name,
          address: iface.address,
          priority: getPriority(iface.address, name)
        });
      }
    }
  }
  
  // Сортируем по приоритету и выбираем лучший
  if (candidates.length > 0) {
    candidates.sort((a, b) => b.priority - a.priority);
    return candidates[0].address;
  }
  
  return 'localhost';
}

/**
 * Определяет приоритет IP адреса
 * Предпочитает Wi-Fi и типичные домашние сети
 */
function getPriority(address, interfaceName) {
  let priority = 0;
  
  // Приоритет для Wi-Fi адаптеров
  if (/wi-?fi|wireless|wlan/i.test(interfaceName)) {
    priority += 100;
  }
  
  // Приоритет для типичных домашних сетей
  if (address.startsWith('192.168.')) {
    priority += 50;
  } else if (address.startsWith('10.')) {
    priority += 40;
  } else if (address.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)) {
    priority += 45;
  }
  
  // Ethernet тоже хорош
  if (/ethernet|eth/i.test(interfaceName)) {
    priority += 30;
  }
  
  return priority;
}

/**
 * Получить все локальные IP адреса (исключая виртуальные адаптеры)
 */
function getAllLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  
  for (const name of Object.keys(interfaces)) {
    // Пропускаем виртуальные адаптеры
    if (isVirtualAdapter(name)) {
      continue;
    }
    
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({
          name,
          address: iface.address,
          netmask: iface.netmask
        });
      }
    }
  }
  
  return addresses;
}

module.exports = {
  getLocalIpAddress,
  getAllLocalIpAddresses
};
