import {
  PutObjectCommand,
  DeleteObjectsCommand,
  ListObjectsCommand,
} from "@aws-sdk/client-s3";
import { s3Client, env } from "./libs/s3Client.js";

import fs from "fs";
import mime from "mime-types";

async function removeFilesFromDir(bucket, dir) {
  const listParams = {
    Bucket: bucket,
    Prefix: dir,
  };

  const listedObjects = await s3Client.send(new ListObjectsCommand(listParams));

  if (!listedObjects.Contents || listedObjects.Contents.length === 0) return;

  const deleteParams = {
    Bucket: bucket,
    Delete: { Objects: [] },
  };

  listedObjects.Contents.forEach(({ Key }) => {
    deleteParams.Delete.Objects.push({ Key });
  });

  console.log("Удаление объектов:");
  console.log(deleteParams.Delete.Objects);

  await s3Client.send(new DeleteObjectsCommand(deleteParams));
}

async function putObjects(filenames, srcDir, bucket, destDir) {
  if (!srcDir.endsWith("/")) {
    srcDir += "/";
  }
  if (!destDir.endsWith("/")) {
    destDir += "/";
  }

  for (const filename of filenames) {
    const localPath = srcDir + filename;
    const bucketPath = destDir + filename;
    const content = fs.readFileSync(localPath);
    const params = {
      Bucket: bucket,
      Key: bucketPath,
      Body: content,
      ContentType: mime.lookup(bucketPath),
      ACL: 'public-read',
    };
    await s3Client.send(new PutObjectCommand(params));
  }
}

async function getFilenamesFromDir(result, dir) {
  if (!dir.endsWith("/")) {
    dir += "/";
  }
  const filenames = await fs.promises.readdir(dir);
  for (const filename of filenames) {
    const path = dir + filename;
    const stat = await fs.promises.lstat(path);
    if (stat.isFile()) {
      result.push(path);
    } else {
      await getFilenamesFromDir(result, path);
    }
  }
}

async function sync() {
  // delete all files from website/

  // putObjects()
  const bucketName = env.BUCKET_NAME;
  const websiteBucketDir = env.WEBSITE_BUCKET_DIR || "website";
  let srcDir = env.WEBSITE_SRC;
  srcDir += srcDir.endsWith("/") ? "" : "/";
  const paths = [];
  await getFilenamesFromDir(paths, srcDir);
  const filenames = paths.map((path) => path.replace(srcDir, ""));
  await removeFilesFromDir(env.BUCKET_NAME, websiteBucketDir);

  console.log("Загрузка файлов");
  console.log(filenames);
  await putObjects(filenames, srcDir, bucketName, websiteBucketDir);

  console.log("Обновление файлов завершено");
}

async function run() {
  try {
    await sync();
  } catch (err) {
    console.log("\n\nВо время выполнения возникли ошибки:");
    console.log(err);
  }
}

run();
