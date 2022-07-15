aws --endpoint-url=https://storage.yandexcloud.net s3 sync build/ s3://its-extensions/ --exclude "*.js" --delete
aws --endpoint-url=https://storage.yandexcloud.net s3 sync build/ s3://its-extensions/ --exclude "*" --include "*.js" --content-type application/javascript
