// PWA утилиты
export const registerServiceWorker = async (): Promise<void> => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('SW registered: ', registration);
    } catch (registrationError) {
      console.log('SW registration failed: ', registrationError);
    }
  }
};

// Проверка, установлено ли приложение как PWA
export const isPWAInstalled = (): boolean => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true;
};

// Запрос разрешения на push уведомления
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    console.log('Notification permission denied');
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

// Показать уведомление об установке PWA
export const showInstallPrompt = (): void => {
  const installPrompt = (window as any).deferredPrompt;
  if (installPrompt) {
    installPrompt.prompt();
    installPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      (window as any).deferredPrompt = null;
    });
  }
};

// Инициализация PWA
export const initializePWA = (): void => {
  // Регистрируем service worker
  registerServiceWorker();

  // Обработчик события beforeinstallprompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    (window as any).deferredPrompt = e;
    
    // Можно показать кнопку установки
    const installButton = document.getElementById('install-button');
    if (installButton) {
      installButton.style.display = 'block';
      installButton.addEventListener('click', showInstallPrompt);
    }
  });

  // Обработчик успешной установки
  window.addEventListener('appinstalled', () => {
    console.log('PWA was installed');
    (window as any).deferredPrompt = null;
    
    // Скрываем кнопку установки
    const installButton = document.getElementById('install-button');
    if (installButton) {
      installButton.style.display = 'none';
    }
  });
};

// Проверка поддержки PWA функций
export const checkPWASupport = () => {
  const support = {
    serviceWorker: 'serviceWorker' in navigator,
    pushManager: 'PushManager' in window,
    notifications: 'Notification' in window,
    installPrompt: 'beforeinstallprompt' in window,
    standalone: window.matchMedia('(display-mode: standalone)').matches
  };

  console.log('PWA Support:', support);
  return support;
}; 