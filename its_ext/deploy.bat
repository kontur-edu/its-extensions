rmdir /S /Q build 2>nul
npm run build
aws --endpoint-url=https://storage.yandexcloud.net s3 rm s3://its-extensions/ --recursive
aws --endpoint-url=https://storage.yandexcloud.net s3 cp --recursive build/ s3://its-extensions/
