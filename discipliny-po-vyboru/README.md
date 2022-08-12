# discipliny-po-vyboru Extensions

## Deploy

### Создайте Yandex Cloud Function
1. Создайте новую функцию и дайте ей публичный доступ 
2. Загрузите файлы ```function.js``` и ```package.json```
3. Создайте версию
4. Скопируйте id фунции

### Измените конфигурацию API-Gateway
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
