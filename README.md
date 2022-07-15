# ITS Extensions

## Прокси

### Создайте Cloud Function

1. Создайте Yandex Cloud Function
2. Скопируйте файлы funtion.js -> index.js и package.json -> package.json
3. Скопируйте идентификатор функции
4. Создайте версию


## Сайт

### Сервисный аккаунт

1. Создайте сервисный аккаунт, сгенерируйте идетификатор ключа и секертный ключ
 - Роли сервисного аккаунта: ```storage.viewer```, ```storage.uploader```, ```storage.editor```

### Object Storage WebSite

1. Создайте Object Storage и bucket (с именем its-extensions)
2. Настройте пункт Веб-сайт
3. Настройте Политику доступа
  - Для консоли дайте права по умолчанию
  - Для сервисного аккаунта правило на просмотр ListObjects, PutObject, GetObject (или все права на bucket)
  - В правиле дл сервисного аккаунта укажите ресурсы `its-extensions/*` и `its-extensions`

### Api Gateway

1. Настройте конфигурацию
```
openapi: 3.0.0
info:
  title: Sample API
  version: 1.0.0
servers:
- url: https://<domain>.apigw.yandexcloud.net
paths:
  /proxy/{requestUrl+}:
    x-yc-apigateway-any-method:
      x-yc-apigateway-integration:
        type: cloud_functions
        function_id: <function_id>
        tag: $latest
      parameters:
      - explode: false
        in: path
        name: requestUrl
        required: true
        schema:
          type: string
        style: simple
      summary: proxy
  /{file+}:
    get:
      x-yc-apigateway-integration:
        type: object_storage
        bucket: its-extensions
        object: '{file}'
      parameters:
      - explode: false
        in: path
        name: file
        required: true
        schema:
          type: string
        style: simple
      summary: Serve static file from Yandex Cloud Object Storage
```
2. Укажите url функции прокси в `its_ext\src\utils\constants.ts`
```
export const PROXY_URL = "https://<domain>.apigw.yandexcloud.net/proxy";
```

## Deploy

### Настройте [AWS CLI](https://cloud.yandex.ru/docs/storage/tools/aws-cli) 

### Выполните `npm run deploy` или `deploy.bat`