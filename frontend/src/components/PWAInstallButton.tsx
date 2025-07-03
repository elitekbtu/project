import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'default',
  size = 'md'
}) => {
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Проверяем, установлено ли уже приложение
    const checkIfInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (window.navigator as any).standalone === true;
      setIsInstalled(isStandalone || isIOSStandalone);
    };

    checkIfInstalled();

    // Обработчик события beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setShowInstallButton(true);
    };

    // Обработчик успешной установки
    const handleAppInstalled = () => {
      setShowInstallButton(false);
      setIsInstalled(true);
    };

    // Обработчик изменения display mode
    const handleDisplayModeChange = () => {
      checkIfInstalled();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.matchMedia('(display-mode: standalone)').addEventListener('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.matchMedia('(display-mode: standalone)').removeEventListener('change', handleDisplayModeChange);
    };
  }, []);

  const handleInstallClick = () => {
    const installPrompt = (window as any).deferredPrompt;
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
          setShowInstallButton(false);
        } else {
          console.log('User dismissed the install prompt');
        }
        (window as any).deferredPrompt = null;
      });
    }
  };

  // Если приложение уже установлено или кнопка не должна показываться
  if (isInstalled || !showInstallButton) {
    return null;
  }

  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background';
  
  const variantClasses = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    outline: 'border border-input hover:bg-accent hover:text-accent-foreground',
    ghost: 'hover:bg-accent hover:text-accent-foreground'
  };

  const sizeClasses = {
    sm: 'h-9 px-3 text-sm',
    md: 'h-10 px-4 py-2',
    lg: 'h-11 px-8'
  };

  const buttonClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

  return (
    <button
      onClick={handleInstallClick}
      className={buttonClasses}
      id="install-button"
    >
      <Download className="w-4 h-4 mr-2" />
      Установить приложение
    </button>
  );
};

export default PWAInstallButton; 