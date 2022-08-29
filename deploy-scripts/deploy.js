import {
  CreateBucketCommand,
  PutBucketPolicyCommand,
} from "@aws-sdk/client-s3";
import { s3Client, env } from "./libs/s3Client.js";
import {
  prepareApiGatewaySpec,
  defaultParams,
  deleteFile,
  zipFiles,
  getFunctionId,
  createFunction,
  makeFunctionPublic,
  getApiGateWayDomain,
  createApiGateway,
  updateApiGatewaySpec,
  createFunctionVersion,
  getApiGateWaySpec,
  getUserId,
  getServiceAccountId,
  createBucketPolicy,
} from "./utils.js";

async function tryCreateBucket(client, bucketName) {
  try {
    const data = await client.send(
      new CreateBucketCommand({ Bucket: bucketName })
    );
    console.log("Successfully created a bucket called ", data.Location);
    return true;
  } catch (err) {
    console.log("Bucket creation failed. " + err);
  }
  return false;
}

export async function updateBucketPolicy(client, bucketName, policy) {
  const params = {
    Bucket: bucketName,
    Policy: JSON.stringify(policy),
  };
  try {
    const res = await client.send(new PutBucketPolicyCommand(params));
    return res;
  } catch (err) {
    console.log(`Failed to update policy:`, params);
    console.log(`Error: `, err);
  }
}

async function prepareBucket(
  client,
  bucketName,
  userLogin,
  serviceAccountName
) {
  await tryCreateBucket(client, bucketName);
  const userId = await getUserId(userLogin);
  const serviceAccountId = await getServiceAccountId(serviceAccountName);
  const bucketPolicy = createBucketPolicy(bucketName, userId, serviceAccountId);
  console.log("Updating policy: ", bucketPolicy);
  const res = await updateBucketPolicy(client, bucketName, bucketPolicy);
  return res;
}

const FUNC_ZIP_FNAME = "function.zip";

async function prepareFunctions(functionName, notionFunctionName) {
  let functionId = await getFunctionId(functionName);
  if (!functionId) {
    console.log("function not found, creating...");
    functionId = await createFunction(functionName);
    await makeFunctionPublic(functionName);
  }

  let notionFunctionId = null;
  if (notionFunctionName) {
    notionFunctionId = await getFunctionId(notionFunctionName);
    if (!notionFunctionId) {
      console.log("notion function not found, creating...");
      notionFunctionId = await createFunction(notionFunctionName);
      await makeFunctionPublic(notionFunctionName);
    }
  }
  return { functionId, notionFunctionId };
}

async function ensureApiGatewayDomain(
  gatewayName,
  functionId,
  notionFunctionId,
  bucketName,
  websiteDir,
  apiGatewaySpec
) {
  let domain = await getApiGateWayDomain(gatewayName);
  if (!domain) {
    console.log("api-gateway not found, creating...");

    const { preparedSpecFilename, content } = await prepareApiGatewaySpec(
      apiGatewaySpec,
      {
        ...defaultParams,
        function_id: functionId,
        bucket_name: bucketName,
        website_dir: websiteDir,
        notion_function_id: notionFunctionId,
      }
    );

    domain = await createApiGateway(gatewayName, preparedSpecFilename);
    await deleteFile(preparedSpecFilename);
  }
  return domain;
}

async function prepareApiGateway(
  gatewayName,
  functionId,
  notionFunctionId,
  bucketName,
  websiteDir,
  apiGatewaySpec,
  domain
) {
  const apiGatewayParams = {
    server_url: `https://${domain}`,
    function_id: functionId,
    bucket_name: bucketName,
    website_dir: websiteDir,
    notion_function_id: notionFunctionId,
  };

  const existingSpec = await getApiGateWaySpec(gatewayName);
  let specIsCorrect = true;
  for (const key in apiGatewayParams) {
    if (apiGatewayParams[key] && !existingSpec.includes(apiGatewayParams[key])) {
      specIsCorrect = false;
      break;
    }
  }

  if (specIsCorrect) {
    console.log("Existing api-gateway spec is correct");
  } else {
    console.log("Spec is different, updating...");
    const { preparedSpecFilename, content } = await prepareApiGatewaySpec(
      apiGatewaySpec,
      apiGatewayParams
    );
    await updateApiGatewaySpec(gatewayName, preparedSpecFilename);

    await deleteFile(preparedSpecFilename);
  }
}

async function prepareFunctionVersion(
  archiveName,
  functionName,
  functionSrcDir,
  filenames
) {
  archiveName = `${Date.now()}_${archiveName}`;
  const ptr = await zipFiles(archiveName, functionSrcDir, filenames);
  await createFunctionVersion(functionName, archiveName);
  await deleteFile(archiveName);
}

async function deploy() {
  const bucketName = env.BUCKET_NAME;
  const apigatewaySpecFilename = env.API_GATEWAY_SPEC_TEMPLATE;
  const apigatewaySpecWithNotionFilename =
    env.API_GATEWAY_SPEC_WITH_NOTION_PROXY_TEMPLATE;
  const functionName = env.FUNCTION_NAME;
  const notionFunctionName = env.NOTION_PROXY_FUNCTION_NAME.trim();
  const gatewayName = env.API_GATEWAY_NAME;
  const functionSrcDir = env.FUNCTION_SRC_DIR;
  const notionFunctionSrcDir = env.NOTION_PROXY_FUNCTION_SRC_DIR;
  const userLogin = env.USER_LOGIN;
  const serviceAccountName = env.SERVICE_ACCOUNT_NAME;
  const websiteDir = env.WEBSITE_BUCKET_DIR;

  const policyUpdateRes = prepareBucket(
    s3Client,
    bucketName,
    userLogin,
    serviceAccountName
  );

  const { functionId, notionFunctionId } = await prepareFunctions(
    functionName,
    notionFunctionName
  );

  const suitableApigatewaySpecFilename = notionFunctionId
    ? apigatewaySpecWithNotionFilename
    : apigatewaySpecFilename;

  console.log(`API-Gateway: using spec: ${suitableApigatewaySpecFilename}`);
  console.log(suitableApigatewaySpecFilename);
  let domain = await ensureApiGatewayDomain(
    gatewayName,
    functionId,
    notionFunctionId,
    bucketName,
    websiteDir,
    suitableApigatewaySpecFilename
  );
  console.log(`API-Gateway domain: ${domain}`);

  await prepareApiGateway(
    gatewayName,
    functionId,
    notionFunctionId,
    bucketName,
    websiteDir,
    suitableApigatewaySpecFilename,
    domain
  );

  const functionFilenames = ["function.js", "package.json"];
  await prepareFunctionVersion(
    FUNC_ZIP_FNAME,
    functionName,
    functionSrcDir,
    functionFilenames
  );

  if (notionFunctionId) {
    await prepareFunctionVersion(
      FUNC_ZIP_FNAME,
      notionFunctionName,
      notionFunctionSrcDir,
      functionFilenames
    );
  }

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
