# discipliny-po-vyboru Extensions

## Развертывание

### 1. Создайте Yandex Cloud Function
1. Создайте новую функцию и дайте ей публичный доступ 
2. Укажите корректные значения константам в файле `constants.js`
```
const PROXY_URL_VALUE = "<https://<домен API-Gateway>/notion>";
const NOTION_MAIN_PAGE_VALUE = "<URL адрес страницы Notion с таблицей спецкурсов>";
```
3. Загрузите файлы ```function.js``` и ```package.json```
4. Создайте версию
5. Скопируйте id фунции

### 2. Измените конфигурацию API-Gateway
1. Перейдите в "Обзор" API-Gateway и нажмите "Редактировать"
2. Добавьте следующие строки конфигурации, указав id созданной Функции
```
...
  /notion/{requestUrl+}:
    x-yc-apigateway-any-method:
      x-yc-apigateway-integration:
        type: cloud_functions
        function_id: <id созданной функции>
        tag: $latest
      parameters:
      - explode: false
        in: path
        name: requestUrl
        required: true
        schema:
          type: string
        style: simple
      summary: notion
...
```
