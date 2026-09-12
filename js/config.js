// Настройки приложения. Меняйте только здесь.
window.BT_CONFIG = {
  VERSION: '1.0.0',

  // URL веб-приложения Google Apps Script (Deploy → Web app → ссылка на /exec).
  // Пока пусто — приложение работает без синхронизации (данные только на этом телефоне).
  API_URL: 'https://script.google.com/macros/s/AKfycbz1WIUtGUWqmDIo4GdC_Hxga6JysTW_VBP-B9tvQm1vhde1o9qkY99PsFkwjza6dmTHVg/exec',

  // Два профиля по умолчанию. Имена/эмодзи/цвета меняются в самом приложении
  // и синхронизируются между телефонами.
  PROFILES: [
    { id: 'p1', name: 'Никита', emoji: '🦊', color: '#5E5CE6' },
    { id: 'p2', name: 'Лерочка', emoji: '🦋', color: '#FF375F' },
    { id: 'p3', name: 'Федос', emoji: '🐒', color: '#25c57a' },
  ],
};
