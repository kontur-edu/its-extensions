# ITS Extensions

## Deploy

### Подготовьте инфраструктуру Yandex Cloud
1. Создайте сервисный аккаунт, сгенерируйте идетификатор ключа и секертный ключ
 - Роли сервисного аккаунта: ```storage.viewer```, ```storage.uploader```, ```storage.editor```
2. Установите и настройте [Yandex Cloud CLI](https://cloud.yandex.ru/docs/cli/quickstart)
3. Установите пакеты для скрипта подготовки инфраструктуры
 - ```cd deploy-script```
 - ```npm install```
4. Укажите ключ доступа и секретный ключ от сервисного аккаунта Yandex Cloud в соответствующие поля файла `.env` или `.env.local`
```
ACCESS_KEY_ID="<ключ доступа>"
SECRET_ACCESS_KEY="<секретный ключ>"
...
```
5. Проверьте остальные константы в файле `.env` или `.env.local`

6. Выполните скрипт установки
 - ```node deploy.js```

### Настройте Bucket
1. Перейдите в настройки Бакета
2. Укажите Публичный доступ для настроек:
  - Доступ на чтение объектов
  - Доступ к списку объектов

### Настройте Политику доступа созданного бакета
1. Перейдите в пункт "Политика доступа"
2. Нажмите на кнопку "Настроить доступ" в верхнем правом углу
#### Консоль
1. Создайте правило для консоли, нажав  "Добавить правило для доступа из консоли"
#### Сервисный аккаунт
1. Создайте правило для сервисного аккаунта, нажав "Добавить правило"
2. Укажите Ресурсы:
  - <название бакета>/*
  - <название бакета>
3. Укадите Дейсвтия (или выберите "Все действия"):
 - ListObjects
 - PutObject
 - GetObject
4. Укажите пользователя - сервисный аккаунт
#### Остальные пользователи
1. Также возможно создать правило с доступом на чтение для всех пользователей
 - Выполните пункты 4, 5
 - Выберите пользователей:
   - Все пользователи
 - Укажите Дейсвтия:
   - ListObjects
   - GetObject

### Настройте Веб-сайт бакета
1. Выберите тип "Хостинг"
2. Укажите главную страницу index.html (нужно для переадресации)
3. Добавьте правило переадресации
4. Укажите доменное имя = доменное имя созданного API-Gateway (можно узнать в "Обзор" API-Gateway)

### Создайте и загрузите сборку сайта, выполнив команды:
1. Проверьте указанный адрес прокси в ```its_ext\src\utils\constants.ts```
```
export const PROXY_URL = "https://<домен API-Gateway>/proxy";
```

2. Соберите проект сайта:
  - ```cd its_ext```
  - ```npm run build```

3. Обновите содержимое папки website в бакете:
  - ```cd deploy-script```
  - ```npm run sync```

<br />

## Локальный запуск

1. Проверить адрес прокси в .npmrc (если прокси не требуется, следует удалить файл .npmrc)
2. Установить зависимости для проектов proxy, proxy-function, its_ext
  - ```cd proxy && npm install```
  - ```cd proxy-function && npm install```
  - ```cd its_ext && npm install```

Ожидается, что приложение будет запущено на http://localhost:3001, если это не так, изменить url в файле proxy/server.js в настройках cors

3. Запустить proxy
  - ```cd proxy && npm run start```
4. Запустить приложение
  - ```cd its_ext && npm run start```
