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
5. Выполните скрипт установки
 - ```node deploy.js```

### Настройте Политику доступа созданного бакета
1. Для консоли дайте права по умолчанию
2. Для сервисного аккаунта правило на просмотр ListObjects, PutObject, GetObject (или все права на bucket)
3. В правиле для сервисного аккаунта укажите ресурсы its-extensions/* и its-extensions

### Настройте [AWS CLI](https://cloud.yandex.ru/docs/storage/tools/aws-cli) 

### Создайте и загрузите сборку сайта, выполнив команды:
  - ```cd its_ext```
  - ```npm run build```
  - ```npm run deploy``` или ```deploy.bat```

<br />

## Локальный запуск

1. Проверить адрес прокси в .npmrc (если не нужен удалить файл .npmrc)
2. Установить зависимости для проектов proxy, proxy-function, its_ext
  - ```cd proxy && npm install```
  - ```cd proxy-function && npm install```
  - ```cd its_ext && npm install```

Ожидается, что приложение будет запущено на http://localhost:3001, если это не так, изменить url в файле proxy/server.js в настройках cors

3. Запустить proxy
  - ```cd proxy && npm run start```
4. Запустить приложение (проверить)
  - ```cd its_ext && npm run start```
