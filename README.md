# ITS Extensions

## Развертывание

### 1. Подготовьте инфраструктуру Yandex Cloud

1. Перейдите в консоль [Yandex Cloud](https://cloud.yandex.ru/)
2. Создайте сервисный аккаунт с ролями: `storage.viewer`, `storage.uploader`, `storage.editor` (или примитивную роль `editor`)

3. Cоздайте в нём статический ключ доступа.
   Сохраните идентификатор и секретный ключ в соответствующие поля файла `deploy-scripts/.env` или `deploy-scripts/.env.local`, также укажите свой логин и имя созданного сервисного аккаунта

```
ACCESS_KEY_ID="<ключ доступа>"
SECRET_ACCESS_KEY="<секретный ключ>"
USER_LOGIN="<логин Yandex Cloud>"
SERVICE_ACCOUNT_NAME="<имя сервисного аккаунта>"
...
```

4. Установите и настройте [Yandex Cloud CLI](https://cloud.yandex.ru/docs/cli/quickstart)
5. Установите пакеты для скрипта подготовки инфраструктуры

   - `cd deploy-scripts`
   - `npm install`

6. Проверьте остальные константы в файле `.env` или `.env.local` (настройки `.env.local` имеют больший приоритет)
   - Если функция notion прокси не требуется (нужна для работы расширения `discipliny-po-vyboru`), удалите значение поля `NOTION_PROXY_FUNCTION_NAME=`

7. Выполните скрипт подготовки инфраструктуры

   - `node deploy.js`

### 2. Настройте Bucket

1. Перейдите в Object storage в раздел Настройки только что созданного бакета из `.env` или `.env.local`
2. Укажите `Публичный` доступ для настроек:

   - Доступ на чтение объектов
   - Доступ к списку объектов

### 3. Настройте Веб-сайт бакета

1. Выберите тип "Хостинг"
2. Укажите главную страницу index.html (нужно для переадресации)
3. Добавьте правило переадресации
4. Укажите доменное имя = доменное имя созданного API-Gateway (можно узнать в "Обзор" API-Gateway)
5. Если нужно, добавьте файл index.html с инструкцией использования сервиса в корень бакета

### 4. Создайте и загрузите сборку сайта, выполнив команды:

1. Укажите адрес прокси в поле `REACT_APP_ITS_PROXY_URL` конфигурационного файла `its_ext\.env` или `its_ext\.env.local`
   ```
   REACT_APP_ITS_PROXY_URL=http://<доменное имя API-Gateway>/proxy
   ...
   ```
2. Соберите проект сайта:

   - `cd its_ext`
   - `npm run build`

3. Обновите содержимое папки website в бакете:

   - `cd deploy-scripts`
   - `npm run sync`

<br />

---

## Локальный запуск

1. Проверьте адрес прокси к npm в .npmrc (если прокси не требуется, следует удалить файл .npmrc)
2. Установите зависимости для проектов proxy, proxy-function, its_ext

   - `cd proxy && npm install && cd ..`
   - `cd proxy-function && npm install && cd ..`
   - `cd its_ext && npm install && cd ..`

Ожидается, что приложение будет запущено на http://localhost:3001, если это не так, измените url в файле proxy/server.js в настройках cors

3. Запустите proxy

   - `cd proxy && npm run start`

4. Запустите приложение

   - `cd its_ext && npm run start`
