import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Info, Smartphone, Wifi, WifiOff } from 'lucide-react';

interface PWAStatusProps {
  className?: string;
  showDetails?: boolean;
}

const PWAStatus: React.FC<PWAStatusProps> = ({
  className = '',
  showDetails = false
}) => {
  const [pwaStatus, setPwaStatus] = useState({
    isInstalled: false,
    isOnline: navigator.onLine,
    hasServiceWorker: false,
    hasNotifications: false,
    hasPushManager: false
  });

  useEffect(() => {
    const checkPWAStatus = () => {
      // Проверяем, установлено ли приложение
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (window.navigator as any).standalone === true;
      
      // Проверяем поддержку различных PWA функций
      const hasSW = 'serviceWorker' in navigator;
      const hasNotifications = 'Notification' in window;
      const hasPushManager = 'PushManager' in window;

      setPwaStatus({
        isInstalled: isStandalone || isIOSStandalone,
        isOnline: navigator.onLine,
        hasServiceWorker: hasSW,
        hasNotifications,
        hasPushManager
      });
    };

    checkPWAStatus();

    // Обработчики событий
    const handleOnline = () => setPwaStatus(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setPwaStatus(prev => ({ ...prev, isOnline: false }));
    const handleDisplayModeChange = () => checkPWAStatus();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.matchMedia('(display-mode: standalone)').addEventListener('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.matchMedia('(display-mode: standalone)').removeEventListener('change', handleDisplayModeChange);
    };
  }, []);

  const getStatusIcon = (condition: boolean) => {
    return condition ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <XCircle className="w-4 h-4 text-red-500" />
    );
  };

  const getStatusText = (condition: boolean, trueText: string, falseText: string) => {
    return condition ? trueText : falseText;
  };

  if (!showDetails) {
    return (
      <div className={`flex items-center space-x-2 text-sm ${className}`}>
        <Smartphone className="w-4 h-4" />
        <span>
          {pwaStatus.isInstalled ? 'Установлено' : 'Не установлено'}
        </span>
        {getStatusIcon(pwaStatus.isInstalled)}
      </div>
    );
  }

  return (
    <div className={`bg-gray-50 rounded-lg p-4 space-y-3 ${className}`}>
      <div className="flex items-center space-x-2">
        <Info className="w-4 h-4 text-blue-500" />
        <span className="font-medium">Статус PWA</span>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm">Установка приложения:</span>
          <div className="flex items-center space-x-2">
            <span className="text-sm">
              {getStatusText(pwaStatus.isInstalled, 'Установлено', 'Не установлено')}
            </span>
            {getStatusIcon(pwaStatus.isInstalled)}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm">Подключение к интернету:</span>
          <div className="flex items-center space-x-2">
            {pwaStatus.isOnline ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}
            <span className="text-sm">
              {getStatusText(pwaStatus.isOnline, 'Онлайн', 'Офлайн')}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm">Service Worker:</span>
          <div className="flex items-center space-x-2">
            <span className="text-sm">
              {getStatusText(pwaStatus.hasServiceWorker, 'Поддерживается', 'Не поддерживается')}
            </span>
            {getStatusIcon(pwaStatus.hasServiceWorker)}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm">Уведомления:</span>
          <div className="flex items-center space-x-2">
            <span className="text-sm">
              {getStatusText(pwaStatus.hasNotifications, 'Поддерживаются', 'Не поддерживаются')}
            </span>
            {getStatusIcon(pwaStatus.hasNotifications)}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm">Push уведомления:</span>
          <div className="flex items-center space-x-2">
            <span className="text-sm">
              {getStatusText(pwaStatus.hasPushManager, 'Поддерживаются', 'Не поддерживаются')}
            </span>
            {getStatusIcon(pwaStatus.hasPushManager)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PWAStatus; 