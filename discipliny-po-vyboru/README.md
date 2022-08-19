# discipliny-po-vyboru Extensions

## 1. Подготовье Yandex Cloud Function

### Развертывание вместе с its_ext

1. Выполните шаг "1. Подготовьте инфраструктуру Yandex Cloud" в разделе "Развертывание" файла README.md в корне репозитория:

   - задайте имя функции в поле `NOTION_PROXY_FUNCTION_NAME=`
   - проверьте путь до папки с кодом функции в поле `NOTION_PROXY_FUNCTION_SRC_DIR=`

2. Сохраните домен созданного API-Gateway в

### Развертывание вручную

1. Перейдите в консоль [Yandex Cloud](https://cloud.yandex.ru/)
2. Создайте новую Yandex Cloud функцию
3. В разделе "Обзор" установите флаг "Публичная функция"
4. Загрузите файлы `function.js` и `package.json` (из папки `discipliny-po-vyboru\notion-function\`) в раздел "Редактор" созданной функции и укажите среду выполнения `Node.js/16`
5. Создайте версию функции
6. Скопируйте идентификатор созданной функции из раздела "Обзор"

## 2. Обновите спецификацию API-Gateway

(Yandex Cloud Function без API-Gateway не подойдет, так как нужна возможность указывать произваольный url и параметры при вызове функции)

1. Если еще не был создан API-Gateway, перейдите в [Yandex Cloud](https://cloud.yandex.ru/) и создайте API-Gateway

1. Отредактируйте спецификацию API-Gateway, добавьте следующие строки, указав значение id созданной функции:

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

2. Сохраните спецификацию и скопируйте `cлужебный домен` API-Gateway из раздела "Обзор"

### 3. Сконфигурируйте Chrome extension

1. Укажите корректные значения константам в файле `constants.js`

```
const PROXY_URL_VALUE = "<https://<домен API-Gateway>/notion>";
const NOTION_MAIN_PAGE_VALUE = "<URL адрес страницы Notion с таблицей спецкурсов>";
```

### 4. Опубликуйте или обновите расширение

1. Перейдите в [консоль разработчика Google](https://chrome.google.com/webstore/devconsole)

2. Если не зарегистрированы, [зарегистрируйте](https://developer.chrome.com/docs/webstore/register/) аккаунт разработчика

3. Если расширение было ранее опубликовано, инкрементируйте версию продукта (`version`) в манифесте:

   `discipliny-po-vyboru\chrome-extension\manifest.json`

4. Создайте zip архив с содержимым папки расширения `discipliny-po-vyboru\chrome-extension\`

5. Загрузите архив в [консоль разработчика Google](https://chrome.google.com/webstore/devconsole):

   `"Add new item"` > `"Choose file"` > _Выбрать архив_ > `"Upload"`

6. Заполните информацию о расширении:

   Title, Summary, Detailed Description, Category, Language

7. Отправьте расширение на ревью, нажав `"Submit for Review"`, и дождатесь результатов ревью

8. Если вы сняли флаг автоматической публикации после прохождения ревью, опубликуйте расширение
