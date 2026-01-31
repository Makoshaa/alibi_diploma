import * as faceapi from '@vladmandic/face-api';

// Определяем URL для моделей: либо из env переменной, либо используем текущий origin
const getModelUrl = () => {
  // Если есть VITE_API_BASE_URL, извлекаем базовый URL (без /api)
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (apiBaseUrl) {
    // Убираем /api из конца и добавляем /models
    const baseUrl = apiBaseUrl.replace(/\/api$/, '');
    return `${baseUrl}/models`;
  }
  // Fallback на относительный путь (для dev режима с localhost)
  return '/models';
};

const MODEL_URL = getModelUrl();
let modelsLoaded = false;

/**
 * Загрузить модели face-api.js для обнаружения лиц и вычисления дескрипторов
 */
export async function loadFaceApiModels() {
  if (modelsLoaded) {
    return;
  }

  try {
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
    ]);

    modelsLoaded = true;
    console.log('[face-api] Модели загружены успешно');
  } catch (error) {
    console.error('[face-api] Ошибка загрузки моделей:', error);
    throw new Error('Не удалось загрузить модели распознавания лиц');
  }
}

/**
 * Вычислить дескриптор лица из файла изображения
 * @param {File} imageFile - Файл изображения
 * @returns {Promise<number[]>} - Массив дескриптора (128 чисел)
 */
export async function computeDescriptorFromFile(imageFile) {
  await loadFaceApiModels();

  const img = await loadImageFromFile(imageFile);

  try {
    const detection = await faceapi
      .detectSingleFace(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection || !detection.descriptor) {
      throw new Error('Лицо не обнаружено на изображении');
    }

    return Array.from(detection.descriptor);
  } catch (error) {
    console.error('[face-api] Ошибка вычисления дескриптора:', error);
    throw error;
  }
}

/**
 * Вычислить дескриптор лица из Data URI (base64)
 * @param {string} dataUri - Data URI изображения
 * @returns {Promise<number[]>} - Массив дескриптора (128 чисел)
 */
export async function computeDescriptorFromDataUri(dataUri) {
  await loadFaceApiModels();

  const img = await loadImageFromDataUri(dataUri);

  try {
    const detection = await faceapi
      .detectSingleFace(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection || !detection.descriptor) {
      throw new Error('Лицо не обнаружено на изображении');
    }

    return Array.from(detection.descriptor);
  } catch (error) {
    console.error('[face-api] Ошибка вычисления дескриптора:', error);
    throw error;
  }
}

/**
 * Загрузить изображение из файла
 * @param {File} file - Файл изображения
 * @returns {Promise<HTMLImageElement>}
 */
function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const img = new Image();
      
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Не удалось загрузить изображение'));
      img.src = event.target.result;
    };
    
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.readAsDataURL(file);
  });
}

/**
 * Загрузить изображение из Data URI
 * @param {string} dataUri - Data URI изображения
 * @returns {Promise<HTMLImageElement>}
 */
function loadImageFromDataUri(dataUri) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Не удалось загрузить изображение'));
    img.src = dataUri;
  });
}

/**
 * Проверить, загружены ли модели
 */
export function areModelsLoaded() {
  return modelsLoaded;
}
