import { CreateBucketCommand, ListBucketsCommand } from "@aws-sdk/client-s3";
import { s3Client, env } from "./libs/s3Client.js";
import {
  prepareApiGatewaySpec,
  defaultParams,
  deleteFile,
  zipFiles,
  getFunctionId,
  createFunction,
  makeFunctionPublick,
  getApiGateWayDomain,
  createApiGateway,
  updateApiGatewaySpec,
  createFunctionVersion,
  getApiGateWaySpec,
} from "./utils.js";

async function tryCreateBuckets(client, bucketName) {
  try {
    const data = await s3Client.send(
      new CreateBucketCommand({ Bucket: bucketName })
    );
    console.log("Successfully created a bucket called ", data.Location);
    return true;
  } catch (err) {
    console.log("Bucket creation failed");
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
  const functionName = env.FUNCTION_NAME;
  const gatewayName = env.API_GATEWAY_NAME;
  const functionSrcDir = env.FUNCTION_SRC_DIR;
  const created = tryCreateBuckets(s3Client, bucketName);
  // const buckets = await getBuckets(s3Client, bucketName);
  let function_id = await getFunctionId(functionName);
  if (!function_id) {
    console.log("function not found, creating...");
    function_id = await createFunction(functionName);
    await makeFunctionPublick(functionName);
  }

  let domain = await getApiGateWayDomain(gatewayName);
  let needSpecUpdate = false;
  if (!domain) {
    console.log("api-gateway not found, creating...");
    needSpecUpdate = true;

    const { preparedSpecFilename, content } = await prepareApiGatewaySpec(
      apigatewaySpecFilename,
      { ...defaultParams, function_id: function_id, bucket_name: bucketName }
    );

    domain = await createApiGateway(gatewayName, preparedSpecFilename);
    await deleteFile(preparedSpecFilename);
  }

  const apiGatewayParams = {
    server_url: `https://${domain}`,
    function_id: function_id,
    bucket_name: bucketName,
  };

  const existingSpec = await getApiGateWaySpec(gatewayName);
  // console.log("existingSpec");
  // console.log(existingSpec);
  let specIsCorrect = true;
  for (const key in apiGatewayParams) {
    if (!existingSpec.includes(apiGatewayParams[key])) {
      specIsCorrect = false;
      break;
    }
  }
  if (specIsCorrect) {
    console.log("Existing api-gateway spec is correct");
  } else {
    console.log("Spec is different, updating...");
    const { preparedSpecFilename, content } = await prepareApiGatewaySpec(
      apigatewaySpecFilename,
      apiGatewayParams
    );
    await updateApiGatewaySpec(gatewayName, preparedSpecFilename);

    await deleteFile(preparedSpecFilename);
  }

  const ptr = await zipFiles(FUNC_ZIP_FNAME, functionSrcDir, [
    "function.js",
    "package.json",
  ]);

  await createFunctionVersion(functionName, FUNC_ZIP_FNAME);

  await deleteFile(FUNC_ZIP_FNAME);

  console.log("\n\nПодготовка завершена");
}

async function run() {
  try {
    await deploy();
  } catch (err) {
    console.log("\n\nВо время выполнения возникли ошибки:");
    console.log(err);
  }
}

run();
