import {
  CreateBucketCommand,
  ListBucketsCommand,
} from "@aws-sdk/client-s3";
import { s3Client, env } from "./libs/s3Client.js";
import {prepareApiGatewaySpec, deleteFile, zipFiles} from "./utils.js";


async function tryCreateBuckets(client, bucketName) {
  try {
    const data = await s3Client.send(
      new CreateBucketCommand({ Bucket: bucketName })
    );
    console.log(data);
    console.log("Successfully created a bucket called ", data.Location);
    return true;
  } catch (err) {
    console.log("Error", err);
  }
  return false;
}

async function getBuckets(client, bucketName) {
  const data = await client.send(
    new ListBucketsCommand({ Bucket: bucketName })
  );
  return data;
}

const FUNC_ZIP_FNAME = "function.zip";

async function deploy() {
  const bucketName = env.BUCKET_NAME;
  const apigatewaySpecFilename = env.API_GATEWAY_SPEC_TEMPLATE;
  // const created = tryCreateBuckets(s3Client, bucketName);
  // const buckets = await getBuckets(s3Client, bucketName);
  const apiGatewayParams = {
    server_url: "",
    function_id: "12123",
    bucket_name: bucketName,
  };
  const specFileName = await prepareApiGatewaySpec(apigatewaySpecFilename, apiGatewayParams);
  console.log(specFileName);

  const functionArchive = "function.zip";

  const ptr = await zipFiles(FUNC_ZIP_FNAME, "../proxy-function", ["function.js", "package.json"]);
  console.log("ptr");
  console.log(ptr);



  await deleteFile(specFileName);
  // await deleteFile(FUNC_ZIP_FNAME);
}

deploy();
