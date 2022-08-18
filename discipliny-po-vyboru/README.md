# discipliny-po-vyboru Extensions

## Развертывание вместе с its_ext

### Подготовьте инфраструктуру Yandex Cloud

1. Выполните шаг "1. Подготовьте инфраструктуру Yandex Cloud" в разделе "Развертывание" файла README.md в корне репозитория:
   - задайте имя функции в поле `NOTION_PROXY_FUNCTION_NAME=`
   - проверьте путь до папки с кодом функции в поле `NOTION_PROXY_FUNCTION_SRC_DIR=`



## Развертывание вручную

### 1. Создайте Yandex Cloud Function и обновите спецификацию API-Gateway

1. Перейдите в консоль [Yandex Cloud](https://cloud.yandex.ru/)
2. Создайте новую Yandex Cloud функцию
3. В разделе "Обзор" установите флаг "Публичная функция"
4. Скопируйте id созданной функции
5. Отредактируйте спецификацию API-Gateway, добавьте следующие строки:

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

(Yandex Cloud Function без API-Gateway не подойдет, так как нужна возможность указывать произваольный url и параметры при вызове функции)

6. Сохраните спецификацию и скопируйте доменное имя API-Gateway
7. Укажите корректные значения константам в файле `constants.js`

```
const PROXY_URL_VALUE = "<https://<домен API-Gateway>/notion>";
const NOTION_MAIN_PAGE_VALUE = "<URL адрес страницы Notion с таблицей спецкурсов>";
```

8. Загрузите файлы `function.js` и `package.json` в раздел "Редактор" созданной функции и укажите среду выполнения `Node.js/16`
9. Создайте версию функции
