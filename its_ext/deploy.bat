rmdir /S /Q build 2>nul
npm run build
@REM Нужно проверить доступ для просмотра списка объектов (кажется, viewer не хватили)
aws --endpoint-url=https://storage.yandexcloud.net s3 rm s3://its-extensions/test/ --recursive
aws --endpoint-url=https://storage.yandexcloud.net s3 cp --recursive build/ s3://its-extensions/test/
