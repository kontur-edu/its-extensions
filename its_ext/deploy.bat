aws --endpoint-url=https://storage.yandexcloud.net s3 sync build/ s3://its-extensions-test/website --exclude "*.js" --delete
aws --endpoint-url=https://storage.yandexcloud.net s3 sync build/ s3://its-extensions-test/website --exclude "*" --include "*.js" --content-type application/javascript
